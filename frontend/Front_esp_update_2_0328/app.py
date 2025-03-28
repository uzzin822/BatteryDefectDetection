from flask import Flask, render_template, flash, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, emit
from models import DBManager
from argon2 import PasswordHasher
import pandas as pd
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
from keras.models import load_model
import os
from flask import send_from_directory
import json
import mysql.connector
from datetime import datetime
from ultralytics import YOLO
import requests

app = Flask(__name__)
app.secret_key = 'your_secret_key'
socketio = SocketIO(app)

@app.before_request
def auto_login_for_dev():
    if not session.get('userid'):
        session['userid'] = 'admin123'
        session['username'] = '김관리자'
        session['userLevel'] = 1000

manager = DBManager()
ph = PasswordHasher()

# MySQL 연결 설정
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "1234",
    "database": "defect_detection"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# 모델 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH_CNN = os.path.join(BASE_DIR, "static", "model_final.h5")
model_secondary = load_model(MODEL_PATH_CNN, compile=False)
MODEL_PATH_UNET = os.path.join(BASE_DIR, "static", "fine_tuned_unet_mobilenet_alpha08.h5")
model_unet = load_model(MODEL_PATH_UNET, compile=False)
MODEL_PATH_YOLO = os.path.join(BASE_DIR, "static", "best.pt")
yolo_model = YOLO(MODEL_PATH_YOLO)

CLASS_MAP = {"Normal": 0, "Pollution": 1, "Damaged": 2}
REVERSE_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}

# 이미지 저장 경로 설정 (수정)
YOLO_IMAGES_DIR = os.path.join(BASE_DIR, "static", "yolo_images")
if not os.path.exists(YOLO_IMAGES_DIR):
    os.makedirs(YOLO_IMAGES_DIR)

FAULTY_IMAGES_DIR = os.path.join(BASE_DIR, "static", "faulty_images")
if not os.path.exists(FAULTY_IMAGES_DIR):
    os.makedirs(FAULTY_IMAGES_DIR)

NORMAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "normal_images")
if not os.path.exists(NORMAL_IMAGES_DIR):
    os.makedirs(NORMAL_IMAGES_DIR)

VISUAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "visual_images")
if not os.path.exists(VISUAL_IMAGES_DIR):
    os.makedirs(VISUAL_IMAGES_DIR)

def generate_filename():
    return datetime.now().strftime("%Y%m%d_%H%M%S") + ".jpg"

def apply_unet_visualization(file):
    img = Image.open(file).convert('RGB')
    original_size = img.size
    img_resized = img.resize((224, 224))
    img_array = np.array(img_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    pred_mask = model_unet.predict(img_array)[0]
    if pred_mask.ndim == 3:
        pred_mask = pred_mask[:, :, 0]
    mask = (pred_mask > 0.5).astype(np.uint8)

    defect_ratio = np.sum(mask) / (224 * 224)
    defect_score = min(defect_ratio * 10000, 100)

    mask_resized = cv2.resize(mask, original_size, interpolation=cv2.INTER_NEAREST)
    img_original = np.array(img)
    overlay = img_original.copy()
    overlay[mask_resized == 1] = [255, 0, 0]

    pil_overlay = Image.fromarray(overlay)
    buf = BytesIO()
    pil_overlay.save(buf, format='PNG')
    base64_str = base64.b64encode(buf.getvalue()).decode('utf-8')

    return base64_str, round(defect_score, 1)

def classify_cnn(file):
    file_bytes = file.read()
    file_cnn = BytesIO(file_bytes)
    file_unet = BytesIO(file_bytes)

    img = Image.open(file_cnn).convert('RGB')
    img_resized = img.resize((128, 128))
    img_array = np.array(img_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    pred = model_secondary.predict(img_array)[0]
    pred_class = np.argmax(pred)
    class_name = REVERSE_CLASS_MAP[pred_class]
    label = '정상' if class_name == 'Normal' else '불량'

    result = {
        'filename': file.filename,
        'label': label,
        'overlay': None,
        'score': None
    }

    if label == '불량':
        overlay_img, defect_score = apply_unet_visualization(file_unet)
        result['overlay'] = overlay_img
        result['score'] = defect_score

    return result

@app.route("/api/detect-battery", methods=["POST"])
def detect_battery():
    if "image/jpeg" not in request.headers.get("Content-Type", ""):
        return jsonify({"error": "Invalid content type"}), 400

    image_data = request.get_data()
    if not image_data:
        return jsonify({"error": "No image data received"}), 400

    filename = generate_filename()
    image_path = os.path.join(YOLO_IMAGES_DIR, filename)
    try:
        with open(image_path, "wb") as f:
            f.write(image_data)
    except Exception as e:
        return jsonify({"error": f"Failed to save image: {str(e)}"}), 500

    image = cv2.imread(image_path)
    if image is None:
        return jsonify({"error": "Failed to load image: possibly corrupt JPEG data"}), 500

    results = yolo_model(image, conf=0.3)  # YOLO 탐지 임계값 조정
    is_battery = 0
    confidence_score = 0.0

    for result in results:
        if result.boxes:
            is_battery = 1
            confidence_score = float(result.boxes.conf[0])
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(image, f"battery: {confidence_score:.2f}", (x1, y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            cv2.imwrite(image_path, image)

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO yolo_detection (originalImage, isBattery, confidenceScore, captureTime, lineIdx, removed) VALUES (%s, %s, %s, %s, %s, %s)",
            (image_path, is_battery, confidence_score, datetime.now(), 1, 0)
        )
        yolo_id = cursor.lastrowid
        conn.commit()

        img = cv2.resize(image, (128, 128))
        img = img / 255.0
        img = np.expand_dims(img, axis=0)
        pred = model_secondary.predict(img)[0]
        label_index = np.argmax(pred)
        label = '정상' if label_index == 1 else '불량'

        if label == '불량':
            overlay_img, defect_score = apply_unet_visualization(BytesIO(image_data))
            faulty_path = os.path.join(FAULTY_IMAGES_DIR, filename)
            cv2.imwrite(faulty_path, image)
            cursor.execute(
                "INSERT INTO faulty_log (lineIdx, faultyScore, faultyImage, status, logDate, removed) VALUES (%s, %s, %s, %s, %s, %s)",
                (1, defect_score, faulty_path, "불량(심각)", datetime.now(), 0)
            )
            faulty_id = cursor.lastrowid
            visual_path = os.path.join(VISUAL_IMAGES_DIR, filename)
            with open(visual_path, "wb") as f:
                f.write(base64.b64decode(overlay_img))
            cursor.execute(
                "INSERT INTO fault_visual (faultyIdx, visualImage, faultScore, logDate, removed) VALUES (%s, %s, %s, %s, %s)",
                (faulty_id, visual_path, defect_score, datetime.now(), 0)
            )
            conn.commit()
            socketio.emit('new_alert', {
                'message': f"라인 1에서 불량(심각) 발생",
                'alertId': faulty_id
            })
        else:
            normal_path = os.path.join(NORMAL_IMAGES_DIR, filename)
            cv2.imwrite(normal_path, image)
            cursor.execute(
                "INSERT INTO normal_log (normalImage, logDate, lineIdx, removed) VALUES (%s, %s, %s, %s)",
                (normal_path, datetime.now(), 1, 0)
            )
            conn.commit()

    except mysql.connector.Error as e:
        print(f"Database error: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": f"Error: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    # Flask 정적 파일 경로로 변환
    web_image_path = url_for('static', filename=f'yolo_images/{filename}')
    socketio.emit('new_image', {'image_path': web_image_path})

    if is_battery:
        requests.post("http://127.0.0.1:5000/api/pause-scroll")

    requests.post("http://127.0.0.1:5000/api/resume-scroll")

    return jsonify({
        "image_path": web_image_path,
        "isBattery": is_battery,
        "confidenceScore": confidence_score
    })

@app.route("/api/pause-scroll", methods=["POST"])
def pause_scroll():
    return jsonify({"status": "paused"}), 200

@app.route("/api/resume-scroll", methods=["POST"])
def resume_scroll():
    return jsonify({"status": "resumed"}), 200

@app.route("/api/get-latest-image")
def get_latest_image():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT originalImage FROM yolo_detection WHERE lineIdx = 1 ORDER BY detectionIdx DESC LIMIT 1")
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if result:
        # Flask 정적 파일 경로로 변환
        filename = os.path.basename(result[0])
        web_image_path = url_for('static', filename=f'yolo_images/{filename}')
        return jsonify({"image_path": web_image_path})
    return jsonify({"image_path": ""})

@app.route('/conveyor')
def conveyor():
    return render_template('conveyor.html')

@app.route('/test-upload', methods=['GET'])
def test_upload():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('test.html')

@app.route('/analyze-one', methods=['POST'])
def analyze_one():
    if 'image' not in request.files:
        return jsonify({'error': '이미지가 업로드되지 않았습니다.'}), 400

    try:
        file = request.files['image']
        result = classify_cnn(file)
        return jsonify(result)
    except Exception as e:
        print(f"[analyze-one 오류] {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-visual', methods=['POST'])
def get_visual():
    file = request.files['image']
    overlay_base64, _ = apply_unet_visualization(file)
    return jsonify({'overlay': overlay_base64})

@app.route('/')
def index():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/analysis')
def analysis():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('analysis.html')

@app.route('/batch-predict')
def batch_predict():
    if 'userid' not in session:
        return redirect(url_for('login'))

    image_dir = os.path.join(BASE_DIR, 'images')
    results = []
    for fname in os.listdir(image_dir):
        if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            filepath = os.path.join(image_dir, fname)
            with open(filepath, 'rb') as f:
                pass  # predict_and_get_base64 함수가 정의되지 않았으므로 임시로 주석 처리

    return render_template('batch_predict.html', results=results)

@app.route('/detail-analysis')
def detail_analysis():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('detail-analysis.html')

@app.route('/monitoring')
def monitoring():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('monitoring.html')

@app.route('/userpage')
def userpage():
    if 'userid' not in session:
        return redirect(url_for('login'))

    mydata = manager.get_user_info(session['userid'])
    return render_template('userpage.html', mydata=mydata)

@app.route('/system-management')
def system_management():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('system-management.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        userid = request.form.get('userid')
        password = request.form.get('password').strip()

        stored_hashed_password = manager.get_user_password_hash(userid)
        if not stored_hashed_password:
            return render_template('login.html', alert_message="등록된 회원이 없습니다.", userid=userid)

        try:
            if not manager.ph.verify(stored_hashed_password, password):
                return render_template('login.html', alert_message="비밀번호가 틀렸습니다.", userid=userid)
        except Exception:
            return render_template('login.html', alert_message="비밀번호 검증 중 오류가 발생했습니다.", userid=userid)

        user_info = manager.get_user_info(userid)

        if user_info['userLevel'] == 0:
            return render_template('login.html', alert_message="회원가입 승인 대기중입니다.", userid=userid)
        if user_info['refusal'] == 1:
            return render_template('login.html', alert_message="회원가입이 거절되었습니다.", userid=userid)
        if user_info['removed'] == 1:
            return render_template('login.html', alert_message="탈퇴한 계정입니다.", userid=userid)

        session['userid'] = user_info['userid']
        session['username'] = user_info['username']
        session['userLevel'] = user_info['userLevel']

        return redirect(url_for('dashboard'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("로그아웃되었습니다.")
    return redirect(url_for('login'))

@app.route('/join', methods=['GET', 'POST'])
def join():
    if request.method == 'POST':
        username = request.form.get('username')
        emp_no = request.form.get('emp_no')
        userid = request.form.get('userid')
        phone1 = request.form.get('phone1')
        phone2 = request.form.get('phone2')
        phone3 = request.form.get('phone3')
        email = request.form.get('email')
        domain = request.form.get('domain')
        password = request.form.get('password')

        userPhone = phone1 + '-' + phone2 + '-' + phone3 
        userEmail = email + '@' + domain
        if not username or not emp_no or not userid or not password or not phone1 or not phone2 or not phone3 or not email or not domain:
            return render_template('login.html', alert_message="모든 필드를 입력해 주세요.")

        insert_success, error_message = manager.insert_user(username, emp_no, userid, password, userPhone, userEmail)
        if insert_success:
            return render_template('login.html', alert_message="회원가입이 성공적으로 완료되었습니다. 관리자의 승인 후 이용 가능합니다.")
        else:
            return render_template('login.html', alert_message=f"회원가입에 실패하였습니다. 다시 시도해 주세요: {error_message}")

    return render_template('login.html')

@app.route('/check_id', methods=['POST'])
def check_id():
    data = request.json
    user_id = data.get('userId')
    is_existing_user = manager.check_user_id_exists(user_id)
    return jsonify({'available': not is_existing_user})

@app.route('/find_password', methods=['POST', 'GET'])
def find_password():
    if request.method == 'POST':
        username = request.form.get('username')
        userid = request.form.get('userid')
        phone1 = request.form.get('phone1')
        phone2 = request.form.get('phone2')
        phone3 = request.form.get('phone3')
        userPhone = f"{phone1}-{phone2}-{phone3}"

        if not username or not userid or not phone1 or not phone2 or not phone3:
            return render_template('lost_password.html', alert_message="모든 필드를 입력해 주세요.")

        user = manager.find_user(username, userid, userPhone)
        if user:
            return redirect(url_for('reset_password', userid=userid))
        else:
            return render_template('lost_password.html', alert_message="사용자 정보를 찾을 수 없습니다.")

    return render_template('lost_password.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    userid = request.args.get('userid')
    if request.method == 'POST':
        userid = request.form.get('userid', userid)
        new_password = request.form.get('new_password').strip()
        re_new_password = request.form.get('re_new_password').strip()

        if not new_password:
            return render_template('reset_password.html', userid=userid, alert_message="새 비밀번호를 입력해 주세요.")
        if new_password != re_new_password:
            return render_template('reset_password.html', userid=userid, alert_message="비밀번호가 일치하지 않습니다.")

        hashed_password = ph.hash(new_password)
        if manager.update_password(userid, hashed_password):
            return render_template('login.html', alert_message="비밀번호가 성공적으로 변경되었습니다.")
        else:
            return render_template('reset_password.html', userid=userid, alert_message="비밀번호 업데이트 중 오류가 발생했습니다.")
    return render_template('reset_password.html', userid=userid)

@app.route('/update_member', methods=['POST'])
def update_member():
    if 'userid' not in session:
        return redirect(url_for('login'))

    user_id = request.form.get('userid', '').strip()
    emp_no = request.form.get('emp_no', '').strip()
    phone1 = request.form.get('phone1', '').strip()
    phone2 = request.form.get('phone2', '').strip()
    phone3 = request.form.get('phone3', '').strip()
    email1 = request.form.get('email1', '').strip()
    email2 = request.form.get('email2', '').strip()
    password = request.form.get('password', '').strip()
    confirmPassword = request.form.get('confirmPassword', '').strip()
    new_level = request.form.get('userLevel', None)

    userEmail = f"{email1}@{email2}" if email1 and email2 else None
    userPhone = f"{phone1}-{phone2}-{phone3}" if phone1 and phone2 and phone3 else None

    if not emp_no or not phone1 or not phone2 or not phone3 or not email1 or not email2:
        mydata = manager.get_member_mypage(user_id)
        return render_template('member/mypage.html', alert_message="모든 필드를 입력해 주세요.", mydata=mydata)

    if password and confirmPassword:
        if password != confirmPassword:
            mydata = manager.get_member_mypage(user_id)
            return render_template('member/mypage.html', alert_message="비밀번호가 일치하지 않습니다.", mydata=mydata)
        hashed_password = ph.hash(password)
    else:
        hashed_password = None

    update_success = manager.update_member_info(user_id, emp_no, hashed_password, userPhone, userEmail, new_level)

    if update_success:
        user_info = manager.get_user_info(user_id)
        session['username'] = user_info['username']
        session['userLevel'] = user_info['userLevel']
        mydata = manager.get_member_mypage(user_id)
        return render_template('member/mypage.html', alert_message="회원정보가 성공적으로 수정되었습니다.", mydata=mydata)
    else:
        mydata = manager.get_member_mypage(user_id)
        return render_template('member/mypage.html', alert_message="회원정보 수정 중 오류가 발생했습니다.", mydata=mydata)

@app.route('/withdraw', methods=['POST'])
def withdraw():
    if 'userid' not in session:
        return redirect(url_for('login'))

    user_id = session['userid']
    user_level = session.get('userLevel', 0)

    withdraw_success = manager.withdraw_member(user_id)

    if withdraw_success:
        if user_level < 100:
            session.pop('userid', None)
            return render_template('login.html', alert_message="회원 탈퇴가 완료되었습니다.")
        else:
            return render_template('admin_dashboard.html', alert_message="회원 탈퇴가 완료되었습니다.")
    else:
        mydata = manager.get_member_mypage(user_id)
        return render_template('member/mypage.html', alert_message="회원 탈퇴 중 오류가 발생했습니다.", mydata=mydata)

@app.route('/member_manage')
def member_manage():
    per_page = 3

    admin_page = request.args.get('admin_page', 1, type=int)
    all_admins = manager.get_admins()
    total_admins = len(all_admins)
    admin_start_idx = (admin_page - 1) * per_page
    admin_end_idx = min(admin_start_idx + per_page, total_admins)
    paginated_admins = all_admins[admin_start_idx:admin_end_idx]
    total_admin_pages = (total_admins // per_page) + (1 if total_admins % per_page > 0 else 0)

    pending_page = request.args.get('pending_page', 1, type=int)
    all_pending_members = manager.get_pending_members()
    total_pending = len(all_pending_members)
    pending_start_idx = (pending_page - 1) * per_page
    pending_end_idx = min(pending_start_idx + per_page, total_pending)
    paginated_pending = all_pending_members[pending_start_idx:pending_end_idx]
    total_pending_pages = (total_pending // per_page) + (1 if total_pending % per_page > 0 else 0)

    member_page = request.args.get('member_page', 1, type=int)
    all_members = manager.get_all_members()
    total_members = len(all_members)
    member_start_idx = (member_page - 1) * per_page
    member_end_idx = min(member_start_idx + per_page, total_members)
    paginated_members = all_members[member_start_idx:member_end_idx]
    total_member_pages = (total_members // per_page) + (1 if total_members % per_page > 0 else 0)

    return render_template(
        'member/member_manage.html',
        per_page=per_page,
        admins=paginated_admins,
        admin_current_page=admin_page,
        total_admins=total_admins,
        admin_total_pages=total_admin_pages,
        pending_members=paginated_pending,
        pending_current_page=pending_page,
        total_pending=total_pending,
        pending_total_pages=total_pending_pages,
        pending_start_idx=pending_start_idx,
        pending_end_idx=pending_end_idx,
        all_members=paginated_members,
        member_current_page=member_page,
        total_members=total_members,
        member_total_pages=total_member_pages,
        member_start_idx=member_start_idx,
        member_end_idx=member_end_idx
    )

@app.route('/approve_member', methods=['POST'])
def approve_member():
    data = request.json
    userid = data.get('userid')
    user_info = manager.get_user_info(userid)
    if not user_info:
        return jsonify({'success': False, 'message': '회원 정보를 찾을 수 없습니다.'}), 404

    success = manager.update_user_level(userid, 1)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False}), 400

@app.route('/refuse_member', methods=['POST'])
def refuse_member():
    data = request.json
    userid = data.get('userid')
    user_info = manager.get_user_info(userid)
    if not user_info:
        return jsonify({'success': False, 'message': '회원 정보를 찾을 수 없습니다.'}), 404

    success = manager.refuse_member(userid)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False}), 400
    
@app.route('/edit_member/<userid>', methods=['GET'])
def edit_member(userid):
    if 'userid' not in session or session.get('userLevel') < 100:
        return redirect(url_for('login'))

    member_data = manager.get_member_mypage(userid)
    if not member_data:
        flash("해당 회원 정보를 찾을 수 없습니다.", "error")
        return redirect(url_for('member_manage'))

    return render_template('member/mypage.html', mydata=member_data)

@app.route('/delete_member', methods=['POST'])
def delete_member():
    data = request.json
    userid = data.get('userid')
    success = manager.withdraw_member(userid)
    if success:
        return jsonify({'success': True, 'message': f"{userid} 회원이 탈퇴처리 되었습니다."})
    else:
        return jsonify({'success': False, 'message': "회원 삭제 실패"})

@app.route('/search_members', methods=['POST'])
def search_members():
    data = request.json
    userid = data.get('userid', '').strip()
    username = data.get('username', '').strip()
    emp_no = data.get('emp_no', '').strip()

    try:
        results = manager.search_members(userid=userid, username=username, emp_no=emp_no)

        if results is not None and len(results) > 0:
            return jsonify({'success': True, 'members': results})
        elif results is not None and len(results) == 0:
            return jsonify({'success': False})
        else:
            return jsonify({'success': False})

    except Exception as e:
        print(f"검색 중 오류 발생: {str(e)}")
        return jsonify({'success': False, 'message': f'검색 중 오류: {str(e)}'})

def load_data():
    df = pd.read_csv("your_processed_data.csv")
    return df

@app.route("/api/chart_data")
def chart_data():
    chart_type = request.args.get("type")
    period = request.args.get("period")

    df = load_data()

    if chart_type == "line":
        result = df.groupby("라인")[period].mean().sort_index()
        return jsonify({
            "labels": result.index.tolist(),
            "values": result.values.tolist()
        })

    elif chart_type == "bar":
        result = df.groupby("날짜")[period].mean().sort_index(ascending=False)
        return jsonify({
            "labels": result.index.tolist(),
            "values": result.values.tolist()
        })

@app.route('/api/anomalies')
def get_anomalies():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT faultyIdx, status, lineIdx FROM faulty_log WHERE status IN ('불량(주의)', '불량(심각)') ORDER BY faultyIdx DESC LIMIT 1")
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    if result:
        anomaly = {"message": f"라인 {result[2]}에서 {result[1]} 발생", "alertId": result[0]}
    else:
        anomaly = {"message": "", "alertId": ""}
    return jsonify(anomaly)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)