from flask import Flask, render_template, flash, request, redirect, url_for, session, jsonify, send_from_directory, abort, current_app
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
import random
from flask import send_from_directory
import json
import mysql.connector
from datetime import datetime
from ultralytics import YOLO
import requests
import sys

app = Flask(__name__)
app.secret_key = 'your_secret_key'
socketio = SocketIO(app)

@app.before_request
def auto_login_for_dev():
    if not session.get('userid'):
        session['userid'] = 'admin123'
        session['username'] = '김관리자'
        session['userLevel'] = 1000
        session['useEmail'] = 'kim@naver.com'

manager = DBManager()
ph = PasswordHasher()

db_config = {
    "host": "218.209.20.32",
    "user": "obmfactory",
    "password": "masterit1234!",
    "database": "defect_detection"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH_YOLO = os.path.join(BASE_DIR, "static", "yolov8_battery_detection.pt")
print(f"MODEL_PATH_YOLO: {MODEL_PATH_YOLO}", file=sys.stdout)
yolo_model = YOLO(MODEL_PATH_YOLO)

MODEL_PATH_CNN = os.path.join(BASE_DIR, "static", "cnn_defect_classification.h5")
print(f"MODEL_PATH_CNN: {MODEL_PATH_CNN}", file=sys.stdout)
try:
    model_secondary = load_model(MODEL_PATH_CNN, compile=False)
    print("CNN 모델 로드 성공", file=sys.stdout)
except Exception as e:
    print(f"CNN 모델 로드 실패: {str(e)}", file=sys.stdout)
    model_secondary = None
if model_secondary is not None:
    print("CNN 모델 로드 확인: model_secondary is not None", file=sys.stdout)
else:
    print("CNN 모델 로드 확인: model_secondary is None", file=sys.stdout)

MODEL_PATH_UNET = os.path.join(BASE_DIR, "static", "unet_defect_visualization.h5")
print(f"MODEL_PATH_UNET: {MODEL_PATH_UNET}", file=sys.stdout)
try:
    model_unet = load_model(MODEL_PATH_UNET, compile=False)
    print("U-Net 모델 로드 성공", file=sys.stdout)
except Exception as e:
    print(f"U-Net 모델 로드 실패: {str(e)}", file=sys.stdout)
    model_unet = None
if model_unet is not None:
    print("U-Net 모델 로드 확인: model_unet is not None", file=sys.stdout)
else:
    print("U-Net 모델 로드 확인: model_unet is None", file=sys.stdout)

CLASS_MAP = {"Normal": 0, "Pollution": 1, "Damaged": 2}
REVERSE_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}

YOLO_IMAGES_DIR = os.path.join(BASE_DIR, "static", "yolo_images")
if not os.path.exists(YOLO_IMAGES_DIR):
    os.makedirs(YOLO_IMAGES_DIR)
print(f"YOLO_IMAGES_DIR: {YOLO_IMAGES_DIR}", file=sys.stdout)

YOLO_IMAGES_DETECTED_DIR = os.path.join(BASE_DIR, "static", "yolo_images_detected")
if not os.path.exists(YOLO_IMAGES_DETECTED_DIR):
    os.makedirs(YOLO_IMAGES_DETECTED_DIR)
print(f"YOLO_IMAGES_DETECTED_DIR: {YOLO_IMAGES_DETECTED_DIR}", file=sys.stdout)

FAULTY_IMAGES_DIR = os.path.join(BASE_DIR, "static", "faulty_images")
if not os.path.exists(FAULTY_IMAGES_DIR):
    os.makedirs(FAULTY_IMAGES_DIR)
print(f"FAULTY_IMAGES_DIR: {FAULTY_IMAGES_DIR}", file=sys.stdout)

NORMAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "normal_images")
if not os.path.exists(NORMAL_IMAGES_DIR):
    os.makedirs(NORMAL_IMAGES_DIR)
print(f"NORMAL_IMAGES_DIR: {NORMAL_IMAGES_DIR}", file=sys.stdout)

VISUAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "visual_images")
if not os.path.exists(VISUAL_IMAGES_DIR):
    os.makedirs(VISUAL_IMAGES_DIR)
print(f"VISUAL_IMAGES_DIR: {VISUAL_IMAGES_DIR}", file=sys.stdout)

def generate_filename():
    return datetime.now().strftime("%Y%m%d_%H%M%S") + ".jpg"

def apply_unet_visualization(file):
    if model_unet is None:
        print("U-Net 모델이 로드되지 않았습니다. 시각화를 건너뜁니다.", file=sys.stdout)
        return None, None, None

    img = Image.open(file).convert('RGB')
    original_size = img.size
    img_resized = img.resize((224, 224))
    img_array = np.array(img_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    try:
        pred_mask = model_unet.predict(img_array)[0]
        if pred_mask.ndim == 3:
            pred_mask = pred_mask[:, :, 0]
        mask = (pred_mask > 0.5).astype(np.uint8)

        defect_ratio = np.sum(mask) / (224 * 224)
        defect_score = min(defect_ratio * 10000, 100)

        y, x = np.where(mask == 1)
        if len(y) > 0 and len(x) > 0:
            y_center = np.mean(y)
            x_center = np.mean(x)
            fault_location = ""
            if y_center < 112:
                fault_location += "상단 "
            else:
                fault_location += "하단 "
            if x_center < 112:
                fault_location += "좌측"
            else:
                fault_location += "우측"
        else:
            fault_location = "미확인"

        mask_resized = cv2.resize(mask, original_size, interpolation=cv2.INTER_NEAREST)
        img_original = np.array(img)
        overlay = img_original.copy()
        overlay[mask_resized == 1] = [255, 0, 0]

        pil_overlay = Image.fromarray(overlay)
        buf = BytesIO()
        pil_overlay.save(buf, format='PNG')
        base64_str = base64.b64encode(buf.getvalue()).decode('utf-8')

        return base64_str, round(defect_score, 1), fault_location
    except Exception as e:
        print(f"U-Net 시각화 실패: {str(e)}", file=sys.stdout)
        return None, None, None

def classify_cnn(file):
    file_bytes = file.read()
    file_cnn = BytesIO(file_bytes)
    file_unet = BytesIO(file_bytes)

    img = Image.open(file_cnn).convert('RGB')
    img_resized = img.resize((128, 128))
    img_array = np.array(img_resized) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    if model_secondary is None:
        print("CNN 모델이 로드되지 않았습니다. 기본값으로 설정합니다.", file=sys.stdout)
        return {
            'filename': file.filename,
            'label': '오류',
            'overlay': None,
            'score': None,
            'fault_location': None
        }

    try:
        pred = model_secondary.predict(img_array)[0]
        pred_class = np.argmax(pred)
        class_name = REVERSE_CLASS_MAP[pred_class]
        label = '정상' if class_name == 'Normal' else '불량'

        result = {
            'filename': file.filename,
            'label': label,
            'overlay': None,
            'score': None,
            'fault_location': None
        }

        if label == '불량':
            overlay_img, defect_score, fault_location = apply_unet_visualization(file_unet)
            result['overlay'] = overlay_img
            result['score'] = defect_score
            result['fault_location'] = fault_location

        return result
    except Exception as e:
        print(f"CNN 예측 실패: {str(e)}", file=sys.stdout)
        return {
            'filename': file.filename,
            'label': '오류',
            'overlay': None,
            'score': None,
            'fault_location': None
        }

@app.route("/api/detect-battery", methods=["POST"])
def detect_battery():
    if "image/jpeg" not in request.headers.get("Content-Type", ""):
        print("Content-Type이 image/jpeg가 아님", file=sys.stdout)
        return jsonify({"error": "Invalid content type"}), 400

    image_data = request.get_data()
    if not image_data:
        print("이미지 데이터 수신 실패", file=sys.stdout)
        return jsonify({"error": "No image data received"}), 400

    image_array = np.frombuffer(image_data, np.uint8)
    print(f"이미지 데이터 크기: {len(image_array)} bytes", file=sys.stdout)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        print("이미지 디코딩 실패", file=sys.stdout)
        return jsonify({"error": "Failed to load image: possibly corrupt JPEG data"}), 500
    print(f"이미지 디코딩 성공: shape={image.shape}", file=sys.stdout)

    # YOLO 탐지 (배터리 클래스만 인식)
    results = yolo_model(image, conf=0.3, classes=[0])  # 배터리 클래스만 인식 (class 0)
    is_battery = 0
    confidence_score = 0.0
    overlay_image = image.copy()

    for result in results:
        if result.boxes:
            is_battery = 1
            for box in result.boxes:
                confidence_score = float(box.conf[0])
                print(f"YOLO 탐지 성공: is_battery={is_battery}, confidence_score={confidence_score}", file=sys.stdout)
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                # 바운딩 박스 그리기
                cv2.rectangle(overlay_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                # 확률 텍스트 추가
                label = f"battery {confidence_score:.2f}"
                cv2.putText(overlay_image, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # YOLO 오버레이 이미지 Base64로 변환
    _, buffer = cv2.imencode('.jpg', overlay_image)
    overlay_base64 = base64.b64encode(buffer).decode('utf-8')
    socketio.emit('new_image', {'image_path': f"data:image/jpeg;base64,{overlay_base64}"})
    print("new_image 이벤트 방출 완료", file=sys.stdout)

    return jsonify({
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
    # 실시간 데이터 사용 안 하므로 더미 이미지 경로 반환
    return jsonify({"image_path": url_for('static', filename='yolo_images_detected/dummy.jpg')})

@app.route('/conveyor')
def conveyor():
    return render_template('conveyor.html')

@app.route('/analyze-one', methods=['POST'])
def analyze_one():
    if 'image' not in request.files:
        return jsonify({'error': '이미지가 업로드되지 않았습니다.'}), 400

    try:
        file = request.files['image']
        result = classify_cnn(file)
        return jsonify(result)
    except Exception as e:
        print(f"[analyze-one 오류] {str(e)}", file=sys.stdout)
        return jsonify({'error': str(e)}), 500

@app.route('/get-visual', methods=['POST'])
def get_visual():
    file = request.files['image']
    overlay_base64, defect_score, fault_location = apply_unet_visualization(file)
    return jsonify({'overlay': overlay_base64, 'score': defect_score, 'fault_location': fault_location})

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

@app.route('/monitoring')
def monitoring():
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('monitoring.html')

@app.route('/userpage')
def userpage():
    if 'userid' not in session:
        flash("로그인 후 접근해 주세요.")
        return redirect(url_for('login'))

    user_id = session['userid']
    mydata = manager.get_member_mypage(user_id)
    return render_template('member/mypage.html', mydata=mydata)

# 시스템 관리
@app.route('/system-management')
def system_management():

    if 'userid' not in session:
        flash("로그인 후 접근해 주세요.")
        return redirect(url_for('login'))

    user_id = session['userid']
    user_info = manager.get_user_info(user_id)  # 사용자 정보 가져오기
    
    
    return render_template('system-management.html', user_info=user_info)

# 점검 요청하기 페이지 
@app.route('/apply_management', methods=['GET', 'POST'])
def apply_management():
    if 'userid' not in session:
        flash("로그인 후 접근해 주세요.")
        return redirect(url_for('login'))

    user_id = session.get('userid')
    user_info = manager.get_user_info(user_id)

    categoryIdx = request.form.get('categoryIdx')
    email = request.form.get('email')
    emailDomain = request.form.get('emailDomain')
    applyTitle = request.form.get('applyTitle')
    applyContent = request.form.get('applyContent')
    applyFile = request.files.get('applyFileName')  # 업로드된 파일 가져오기


    request_history = manager.get_apply_history(user_id)  # 유저의 요청 내역 가져오기

    if not categoryIdx or not user_id or not email or not emailDomain or not applyTitle or not applyContent:
        return render_template('system-management.html', alert_message="모든 필드를 입력해 주세요.", user_info=user_info, request_history = request_history)

    userEmail = f"{email}@{emailDomain}"
    file_path = None
    filename = None  # filename 초기화

    try:
        if applyFile and applyFile.filename:
            # 파일명에서 안전한 문자만 유지 (한글 포함)
            filename = applyFile.filename
            filename = re.sub(r'[^\w가-힣.-]', '_', filename)  # 한글, 영문, 숫자, .(점), -(하이픈) 허용
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            # 동일한 파일명이 존재하면 "_1", "_2" 붙이기
            counter = 1
            original_filename = filename
            while os.path.exists(file_path):
                name, ext = os.path.splitext(original_filename)
                filename = f"{name}_{counter}{ext}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                counter += 1

            applyFile.save(file_path)
            print(f"파일 경로: {file_path}")
        else:
            print("첨부 파일 없음")

    except Exception as e:
        print(f"파일 저장 오류: {str(e)}")
        return render_template('system-management.html', alert_message="파일 저장 중 오류 발생.", user_info=user_info, request_history = request_history)

    # DB 저장
    success, error_message = manager.insert_apply(categoryIdx, user_id, userEmail, applyTitle, applyContent, filename)

    if success:
        flash("요청이 성공적으로 등록되었습니다.", "success")
        return redirect(url_for('apply_management'))  
    else:
        flash(f"요청 등록 실패: {error_message}", "error")
        return redirect(url_for('apply_management')) 
    
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        # static/uploads 폴더에서 파일을 다운로드합니다.
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        abort(404)  # 파일이 존재하지 않을 경우 404 오류 반환

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

# 회원정보 수정     
@app.route('/edit_member/<userid>', methods=['GET'])
def edit_member(userid):
    if 'userid' not in session or session.get('userLevel') < 100:
        return redirect(url_for('login'))

    member_data = manager.get_member_mypage(userid)
    if not member_data:
        flash("해당 회원 정보를 찾을 수 없습니다.", "error")
        return redirect(url_for('member_manage'))

    return render_template('member/mypage.html', mydata=member_data)

# 레벨 수정 - 관리자 회원만 가능
@app.route('/update_user_level', methods=['POST'])
def update_user_level():
    if 'userid' not in session:
        return redirect(url_for('login'))

    user_id = request.form.get('userid')

    # userLevel을 1로 업데이트
    success = manager.update_user_level(user_id, 1)  # DBManager에 해당 메서드 필요

    if success:
        # 회원의 이름을 가져오기
        user_info = manager.get_user_info(user_id)  # 해당 메서드 추가 필요
        flash(f"{user_info['username']} 회원이 일반회원으로 전환되었습니다.")
    else:
        flash("회원 전환 중 오류가 발생했습니다.")

    return redirect(url_for('member_manage'))  # 관리자 관리 페이지로 리디렉션

# 회원 탈퇴 처리
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
        print(f"검색 중 오류 발생: {str(e)}", file=sys.stdout)
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
    # 더미 데이터 반환 (실시간 데이터 사용 안 함)
    return jsonify({"message": "라인 1에서 불량(심각) 발생", "alertId": "1"})

# 불량 상세분석
@app.route('/detail-analysis', methods=['GET','POST'])
def detail_analysis(faultyIdx=None):
    if 'userid' not in session:
        return redirect(url_for('login'))

    # 금일 불량 로그 가져오기
    today_faulty_logs = manager.get_faulty_log(today_only=True)

    # 금일 불량 로그 각각에 대한 라인명 추가
    for log in today_faulty_logs:
        line_type = manager.get_linetype(log['lineIdx'])
        log['lineType'] = line_type  # 라인 타입 추가

    # 페이지 번호 가져오기 (기본값 1)
    page = request.args.get('page', 1, type=int)
    per_page = 8  # 페이지당 표시할 로그 수

    # 불량 + 정상 데이터 로그 가져오기
    today_combined_logs = manager.get_combined_logs(today_only=True)

    # 전체 불량 로그 가져오기
    all_faulty_logs = manager.get_faulty_log()
    total_logs = len(all_faulty_logs)  # 전체 로그 수
    total_pages = (total_logs + per_page - 1) // per_page  # 총 페이지 수 계산

    # 현재 페이지에 해당하는 로그 가져오기
    start = (page - 1) * per_page
    end = start + per_page
    paginated_logs = all_faulty_logs[start:end]

    # 각 로그에 대한 라인명 추가 및 추천 조치사항 가져오기
    for log in paginated_logs:
        line_type = manager.get_linetype(log['lineIdx'])
        log['lineType'] = line_type
        
        # 불량 점수에 따른 추천 조치사항 가져오기
        faultyScore = log['faultyScore']

    # 특정 불량 로그 상세 정보 가져오기
    faultyLog = None
    if faultyIdx is not None:
        faultyLog = manager.get_faulty_log(faultyIdx=faultyIdx)
        if not faultyLog:
            return "해당 로그를 찾을 수 없습니다.", 404

        # 특정 불량 로그에 대한 라인명 추가
        line_type = manager.get_linetype(faultyLog[0]['lineIdx'])
        faultyLog[0]['lineType'] = line_type 

        # 불량 점수에 따른 추천 조치사항 가져오기
        faultyScore = faultyLog[0]['faultyScore']

    return render_template('detail-analysis.html', 
                           faultyLog=faultyLog, 
                           today_faulty_logs=today_faulty_logs,
                           today_combined_logs = today_combined_logs, 
                           all_faulty_logs=paginated_logs, 
                           page=page, 
                           total_pages=total_pages)



if __name__ == '__main__':
    print("Registered routes:", [rule.endpoint for rule in app.url_map.iter_rules()], file=sys.stdout)
    socketio.run(app, host="0.0.0.0", port=5050, debug=True)