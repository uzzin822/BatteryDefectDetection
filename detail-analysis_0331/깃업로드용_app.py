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
import random
import json
import mysql.connector
from datetime import datetime
from ultralytics import YOLO
import requests
import sys
import logging

# Flask 애플리케이션 초기화
app = Flask(__name__)
app.secret_key = 'your_secret_key'  # 세션 암호화를 위한 비밀 키
socketio = SocketIO(app)  # 실시간 통신을 위한 SocketIO 초기화

# 로깅 설정 (디버깅 출력을 파일로 기록)
logging.basicConfig(filename='app.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# 개발용 자동 로그인 (배포 시 주석 처리 권장)
@app.before_request
def auto_login_for_dev():
    """개발 환경에서 자동 로그인을 설정합니다."""
    if not session.get('userid'):
        session['userid'] = 'admin123'
        session['username'] = '김관리자'
        session['userLevel'] = 1000
        logging.info("개발용 자동 로그인 적용: admin123")

# 데이터베이스 및 비밀번호 관리 객체 초기화
manager = DBManager()  # 사용자 정보 관리를 위한 DBManager 인스턴스
ph = PasswordHasher()  # 비밀번호 해싱을 위한 Argon2 객체

# MySQL 데이터베이스 연결 설정
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "1234",
    "database": "defect_detection"
}

def get_db_connection():
    """MySQL 데이터베이스 연결을 반환합니다."""
    return mysql.connector.connect(**db_config)

# 기본 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# YOLO 모델 로드 (배터리 탐지용)
MODEL_PATH_YOLO = os.path.join(BASE_DIR, "static", "yolov8_battery_detection.pt")
yolo_model = YOLO(MODEL_PATH_YOLO)  # YOLOv8 모델 인스턴스 생성

# CNN 모델 로드 (결함 분류용)
MODEL_PATH_CNN = os.path.join(BASE_DIR, "static", "cnn_defect_classification.h5")
try:
    model_secondary = load_model(MODEL_PATH_CNN, compile=False)
    logging.info("CNN 모델 로드 성공")
except Exception as e:
    model_secondary = None
    logging.error(f"CNN 모델 로드 실패: {str(e)}")

# U-Net 모델 로드 (결함 시각화용)
MODEL_PATH_UNET = os.path.join(BASE_DIR, "static", "unet_defect_visualization.h5")
try:
    model_unet = load_model(MODEL_PATH_UNET, compile=False)
    logging.info("U-Net 모델 로드 성공")
except Exception as e:
    model_unet = None
    logging.error(f"U-Net 모델 로드 실패: {str(e)}")

# 결함 분류 클래스 매핑
CLASS_MAP = {"Normal": 0, "Pollution": 1, "Damaged": 2}
REVERSE_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}  # 역방향 매핑

# 이미지 저장 디렉토리 설정
YOLO_IMAGES_DIR = os.path.join(BASE_DIR, "static", "yolo_images")
YOLO_IMAGES_DETECTED_DIR = os.path.join(BASE_DIR, "static", "yolo_images_detected")
FAULTY_IMAGES_DIR = os.path.join(BASE_DIR, "static", "faulty_images")
NORMAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "normal_images")
VISUAL_IMAGES_DIR = os.path.join(BASE_DIR, "static", "visual_images")

# 디렉토리 생성 (존재하지 않을 경우)
for directory in [YOLO_IMAGES_DIR, YOLO_IMAGES_DETECTED_DIR, FAULTY_IMAGES_DIR, 
                  NORMAL_IMAGES_DIR, VISUAL_IMAGES_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)
        logging.info(f"디렉토리 생성: {directory}")

# 고유 파일명 생성 함수
def generate_filename():
    """현재 시간을 기반으로 고유한 이미지 파일명을 생성합니다."""
    return datetime.now().strftime("%Y%m%d_%H%M%S") + ".jpg"

# U-Net을 사용한 결함 시각화 함수
def apply_unet_visualization(file):
    """이미지에서 결함을 시각화하고 결함 점수 및 위치를 반환합니다."""
    if model_unet is None:
        logging.warning("U-Net 모델이 로드되지 않았습니다.")
        return None, None, None

    try:
        img = Image.open(file).convert('RGB')
        original_size = img.size
        img_resized = img.resize((224, 224))  # U-Net 입력 크기에 맞게 조정
        img_array = np.array(img_resized) / 255.0  # 정규화
        img_array = np.expand_dims(img_array, axis=0)  # 배치 차원 추가

        pred_mask = model_unet.predict(img_array)[0]  # 결함 마스크 예측
        if pred_mask.ndim == 3:
            pred_mask = pred_mask[:, :, 0]  # 단일 채널로 변환
        mask = (pred_mask > 0.5).astype(np.uint8)  # 이진화

        defect_ratio = np.sum(mask) / (224 * 224)  # 결함 비율 계산
        defect_score = min(defect_ratio * 10000, 100)  # 결함 점수 (최대 100)

        # 결함 위치 계산
        y, x = np.where(mask == 1)
        fault_location = "미확인"
        if len(y) > 0 and len(x) > 0:
            y_center, x_center = np.mean(y), np.mean(x)
            fault_location = ("상단 " if y_center < 112 else "하단 ") + \
                             ("좌측" if x_center < 112 else "우측")

        # 원본 크기로 마스크 크기 조정 및 오버레이 생성
        mask_resized = cv2.resize(mask, original_size, interpolation=cv2.INTER_NEAREST)
        img_original = np.array(img)
        overlay = img_original.copy()
        overlay[mask_resized == 1] = [255, 0, 0]  # 결함 영역 빨간색 표시

        # Base64로 변환
        pil_overlay = Image.fromarray(overlay)
        buf = BytesIO()
        pil_overlay.save(buf, format='PNG')
        base64_str = base64.b64encode(buf.getvalue()).decode('utf-8')

        return base64_str, round(defect_score, 1), fault_location
    except Exception as e:
        logging.error(f"U-Net 시각화 실패: {str(e)}")
        return None, None, None

# CNN을 사용한 결함 분류 함수
def classify_cnn(file):
    """이미지를 CNN으로 분류하고, 불량일 경우 U-Net 시각화를 적용합니다."""
    file_bytes = file.read()
    file_cnn = BytesIO(file_bytes)
    file_unet = BytesIO(file_bytes)

    try:
        img = Image.open(file_cnn).convert('RGB')
        img_resized = img.resize((128, 128))  # CNN 입력 크기
        img_array = np.array(img_resized) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        if model_secondary is None:
            logging.warning("CNN 모델이 로드되지 않았습니다.")
            return {'filename': file.filename, 'label': '오류', 'overlay': None, 
                    'score': None, 'fault_location': None}

        pred = model_secondary.predict(img_array)[0]
        pred_class = np.argmax(pred)
        class_name = REVERSE_CLASS_MAP[pred_class]
        label = '정상' if class_name == 'Normal' else '불량'

        result = {'filename': file.filename, 'label': label, 'overlay': None, 
                  'score': None, 'fault_location': None}

        if label == '불량':
            overlay_img, defect_score, fault_location = apply_unet_visualization(file_unet)
            result.update({'overlay': overlay_img, 'score': defect_score, 
                          'fault_location': fault_location})

        return result
    except Exception as e:
        logging.error(f"CNN 예측 실패: {str(e)}")
        return {'filename': file.filename, 'label': '오류', 'overlay': None, 
                'score': None, 'fault_location': None}

# YOLO를 사용한 배터리 탐지 API
@app.route("/api/detect-battery", methods=["POST"])
def detect_battery():
    """JPEG 이미지를 받아 YOLO로 배터리를 탐지하고 결과를 반환합니다."""
    if "image/jpeg" not in request.headers.get("Content-Type", ""):
        return jsonify({"error": "Invalid content type"}), 400

    image_data = request.get_data()
    if not image_data:
        return jsonify({"error": "No image data received"}), 400

    image_array = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({"error": "Failed to load image: possibly corrupt JPEG data"}), 500

    # 임시 이미지 저장
    filename = generate_filename()
    temp_image_path = os.path.join(YOLO_IMAGES_DIR, filename)
    cv2.imwrite(temp_image_path, image)
    logging.info(f"임시 이미지 저장: {temp_image_path}")

    # YOLO 탐지 (배터리 클래스만, class 0)
    results = yolo_model(image, conf=0.3, classes=[0])
    is_battery = 0
    confidence_score = 0.0
    overlay_image = image.copy()

    for result in results:
        if result.boxes:
            is_battery = 1
            for box in result.boxes:
                confidence_score = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(overlay_image, (x1, y1), (x2, y2), (0, 255, 0), 2)  # 녹색 박스
                label = f"battery {confidence_score:.2f}"
                cv2.putText(overlay_image, label, (x1, y1 - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # 탐지된 이미지 저장
    if is_battery:
        detected_image_path = os.path.join(YOLO_IMAGES_DETECTED_DIR, filename)
        cv2.imwrite(detected_image_path, overlay_image)
        logging.info(f"탐지 이미지 저장: {detected_image_path}")

    # Base64로 변환 및 소켓 전송
    _, buffer = cv2.imencode('.jpg', overlay_image)
    overlay_base64 = base64.b64encode(buffer).decode('utf-8')
    web_image_path = url_for('static', filename=f'yolo_images_detected/{filename}')
    socketio.emit('new_image', {'image_path': f"data:image/jpeg;base64,{overlay_base64}"})

    return jsonify({"image_path": web_image_path, "isBattery": is_battery, 
                    "confidenceScore": confidence_score})

# 스크롤 제어 API
@app.route("/api/pause-scroll", methods=["POST"])
def pause_scroll():
    """컨베이어 스크롤을 일시 정지합니다."""
    return jsonify({"status": "paused"}), 200

@app.route("/api/resume-scroll", methods=["POST"])
def resume_scroll():
    """컨베이어 스크롤을 재개합니다."""
    return jsonify({"status": "resumed"}), 200

# 최신 이미지 조회 API
@app.route("/api/get-latest-image")
def get_latest_image():
    """최신 탐지 이미지를 반환합니다 (더미 데이터)."""
    return jsonify({"image_path": url_for('static', filename='yolo_images_detected/dummy.jpg')})

# 페이지 라우팅
@app.route('/conveyor')
def conveyor():
    """컨베이어 모니터링 페이지를 렌더링합니다."""
    return render_template('conveyor.html')

@app.route('/analyze-one', methods=['POST'])
def analyze_one():
    """단일 이미지를 CNN으로 분석합니다."""
    if 'image' not in request.files:
        return jsonify({'error': '이미지가 업로드되지 않았습니다.'}), 400

    try:
        file = request.files['image']
        result = classify_cnn(file)
        return jsonify(result)
    except Exception as e:
        logging.error(f"이미지 분석 실패: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-visual', methods=['POST'])
def get_visual():
    """U-Net으로 결함 시각화 결과를 반환합니다."""
    file = request.files['image']
    overlay_base64, defect_score, fault_location = apply_unet_visualization(file)
    return jsonify({'overlay': overlay_base64, 'score': defect_score, 
                    'fault_location': fault_location})

# 기본 페이지 라우팅
@app.route('/')
def index():
    """루트 경로로 접속 시 로그인 상태에 따라 리다이렉트합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    """대시보드 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/analysis')
def analysis():
    """분석 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('analysis.html')

@app.route('/detail-analysis')
def detail_analysis():
    """상세 분석 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('detail-analysis.html')

@app.route('/monitoring')
def monitoring():
    """모니터링 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('monitoring.html')

@app.route('/userpage')
def userpage():
    """사용자 정보 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    mydata = manager.get_user_info(session['userid'])
    return render_template('userpage.html', mydata=mydata)

@app.route('/system-management')
def system_management():
    """시스템 관리 페이지를 렌더링합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('system-management.html')

# 로그인 처리
@app.route('/login', methods=['GET', 'POST'])
def login():
    """사용자 로그인을 처리합니다."""
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
        logging.info(f"로그인 성공: {userid}")
        return redirect(url_for('dashboard'))

    return render_template('login.html')

# 로그아웃 처리
@app.route('/logout')
def logout():
    """세션을 종료하고 로그아웃합니다."""
    session.clear()
    flash("로그아웃되었습니다.")
    return redirect(url_for('login'))

# 회원가입 처리
@app.route('/join', methods=['GET', 'POST'])
def join():
    """신규 사용자 등록을 처리합니다."""
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

        userPhone = f"{phone1}-{phone2}-{phone3}"
        userEmail = f"{email}@{domain}"
        if not all([username, emp_no, userid, password, phone1, phone2, phone3, email, domain]):
            return render_template('login.html', alert_message="모든 필드를 입력해 주세요.")

        insert_success, error_message = manager.insert_user(username, emp_no, userid, 
                                                           password, userPhone, userEmail)
        if insert_success:
            logging.info(f"회원가입 성공: {userid}")
            return render_template('login.html', alert_message="회원가입이 성공적으로 완료되었습니다. 관리자의 승인 후 이용 가능합니다.")
        else:
            logging.error(f"회원가입 실패: {error_message}")
            return render_template('login.html', alert_message=f"회원가입에 실패하였습니다: {error_message}")

    return render_template('login.html')

# ID 중복 확인 API
@app.route('/check_id', methods=['POST'])
def check_id():
    """사용자 ID의 중복 여부를 확인합니다."""
    data = request.json
    user_id = data.get('userId')
    is_existing_user = manager.check_user_id_exists(user_id)
    return jsonify({'available': not is_existing_user})

# 비밀번호 찾기 처리
@app.route('/find_password', methods=['POST', 'GET'])
def find_password():
    """비밀번호 재설정을 위한 사용자 확인을 처리합니다."""
    if request.method == 'POST':
        username = request.form.get('username')
        userid = request.form.get('userid')
        phone1 = request.form.get('phone1')
        phone2 = request.form.get('phone2')
        phone3 = request.form.get('phone3')
        userPhone = f"{phone1}-{phone2}-{phone3}"

        if not all([username, userid, phone1, phone2, phone3]):
            return render_template('lost_password.html', alert_message="모든 필드를 입력해 주세요.")

        user = manager.find_user(username, userid, userPhone)
        if user:
            return redirect(url_for('reset_password', userid=userid))
        else:
            return render_template('lost_password.html', alert_message="사용자 정보를 찾을 수 없습니다.")

    return render_template('lost_password.html')

# 비밀번호 재설정 처리
@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    """비밀번호를 재설정합니다."""
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
            logging.info(f"비밀번호 재설정 성공: {userid}")
            return render_template('login.html', alert_message="비밀번호가 성공적으로 변경되었습니다.")
        else:
            logging.error(f"비밀번호 재설정 실패: {userid}")
            return render_template('reset_password.html', userid=userid, alert_message="비밀번호 업데이트 중 오류가 발생했습니다.")
    return render_template('reset_password.html', userid=userid)

# 회원 정보 수정 처리
@app.route('/update_member', methods=['POST'])
def update_member():
    """로그인한 사용자의 정보를 수정합니다."""
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

    if not all([emp_no, phone1, phone2, phone3, email1, email2]):
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
        logging.info(f"회원 정보 수정 성공: {user_id}")
        return render_template('member/mypage.html', alert_message="회원정보가 성공적으로 수정되었습니다.", mydata=mydata)
    else:
        mydata = manager.get_member_mypage(user_id)
        logging.error(f"회원 정보 수정 실패: {user_id}")
        return render_template('member/mypage.html', alert_message="회원정보 수정 중 오류가 발생했습니다.", mydata=mydata)

# 회원 탈퇴 처리
@app.route('/withdraw', methods=['POST'])
def withdraw():
    """로그인한 사용자를 탈퇴 처리합니다."""
    if 'userid' not in session:
        return redirect(url_for('login'))

    user_id = session['userid']
    user_level = session.get('userLevel', 0)
    withdraw_success = manager.withdraw_member(user_id)

    if withdraw_success:
        if user_level < 100:
            session.pop('userid', None)
            logging.info(f"회원 탈퇴 성공: {user_id}")
            return render_template('login.html', alert_message="회원 탈퇴가 완료되었습니다.")
        else:
            logging.info(f"관리자에 의한 회원 탈퇴 성공: {user_id}")
            return render_template('admin_dashboard.html', alert_message="회원 탈퇴가 완료되었습니다.")
    else:
        mydata = manager.get_member_mypage(user_id)
        logging.error(f"회원 탈퇴 실패: {user_id}")
        return render_template('member/mypage.html', alert_message="회원 탈퇴 중 오류가 발생했습니다.", mydata=mydata)

# 회원 관리 페이지
@app.route('/member_manage')
def member_manage():
    """관리자용 회원 관리 페이지를 렌더링합니다."""
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
        admins=paginated_admins, admin_current_page=admin_page, total_admins=total_admins,
        admin_total_pages=total_admin_pages, pending_members=paginated_pending,
        pending_current_page=pending_page, total_pending=total_pending,
        pending_total_pages=total_pending_pages, pending_start_idx=pending_start_idx,
        pending_end_idx=pending_end_idx, all_members=paginated_members,
        member_current_page=member_page, total_members=total_members,
        member_total_pages=total_member_pages, member_start_idx=member_start_idx,
        member_end_idx=member_end_idx
    )

# 회원 승인 API
@app.route('/approve_member', methods=['POST'])
def approve_member():
    """가입 대기 중인 회원을 승인합니다."""
    data = request.json
    userid = data.get('userid')
    user_info = manager.get_user_info(userid)
    if not user_info:
        return jsonify({'success': False, 'message': '회원 정보를 찾을 수 없습니다.'}), 404

    success = manager.update_user_level(userid, 1)
    if success:
        logging.info(f"회원 승인 성공: {userid}")
        return jsonify({'success': True})
    else:
        logging.error(f"회원 승인 실패: {userid}")
        return jsonify({'success': False}), 400

# 회원 거부 API
@app.route('/refuse_member', methods=['POST'])
def refuse_member():
    """가입 대기 중인 회원을 거부합니다."""
    data = request.json
    userid = data.get('userid')
    user_info = manager.get_user_info(userid)
    if not user_info:
        return jsonify({'success': False, 'message': '회원 정보를 찾을 수 없습니다.'}), 404

    success = manager.refuse_member(userid)
    if success:
        logging.info(f"회원 거부 성공: {userid}")
        return jsonify({'success': True})
    else:
        logging.error(f"회원 거부 실패: {userid}")
        return jsonify({'success': False}), 400

# 회원 정보 수정 페이지
@app.route('/edit_member/<userid>', methods=['GET'])
def edit_member(userid):
    """특정 회원의 정보를 수정하는 페이지를 렌더링합니다."""
    if 'userid' not in session or session.get('userLevel') < 100:
        return redirect(url_for('login'))

    member_data = manager.get_member_mypage(userid)
    if not member_data:
        flash("해당 회원 정보를 찾을 수 없습니다.", "error")
        return redirect(url_for('member_manage'))

    return render_template('member/mypage.html', mydata=member_data)

# 회원 삭제 API
@app.route('/delete_member', methods=['POST'])
def delete_member():
    """특정 회원을 탈퇴 처리합니다."""
    data = request.json
    userid = data.get('userid')
    success = manager.withdraw_member(userid)
    if success:
        logging.info(f"회원 삭제 성공: {userid}")
        return jsonify({'success': True, 'message': f"{userid} 회원이 탈퇴처리 되었습니다."})
    else:
        logging.error(f"회원 삭제 실패: {userid}")
        return jsonify({'success': False, 'message': "회원 삭제 실패"})

# 회원 검색 API
@app.route('/search_members', methods=['POST'])
def search_members():
    """회원 정보를 검색합니다."""
    data = request.json
    userid = data.get('userid', '').strip()
    username = data.get('username', '').strip()
    emp_no = data.get('emp_no', '').strip()

    try:
        results = manager.search_members(userid=userid, username=username, emp_no=emp_no)
        if results and len(results) > 0:
            return jsonify({'success': True, 'members': results})
        else:
            return jsonify({'success': False})
    except Exception as e:
        logging.error(f"회원 검색 실패: {str(e)}")
        return jsonify({'success': False, 'message': f'검색 중 오류: {str(e)}'})

# 차트 데이터 로드 함수
def load_data():
    """차트용 데이터를 CSV에서 로드합니다."""
    return pd.read_csv("your_processed_data.csv")

# 차트 데이터 API
@app.route("/api/chart_data")
def chart_data():
    """라인 또는 날짜별 차트 데이터를 반환합니다."""
    chart_type = request.args.get("type")
    period = request.args.get("period")
    df = load_data()

    if chart_type == "line":
        result = df.groupby("라인")[period].mean().sort_index()
        return jsonify({"labels": result.index.tolist(), "values": result.values.tolist()})
    elif chart_type == "bar":
        result = df.groupby("날짜")[period].mean().sort_index(ascending=False)
        return jsonify({"labels": result.index.tolist(), "values": result.values.tolist()})

# 이상 알림 API (더미 데이터)
@app.route('/api/anomalies')
def get_anomalies():
    """이상 탐지 알림을 반환합니다 (현재 더미 데이터)."""
    return jsonify({"message": "라인 1에서 불량(심각) 발생", "alertId": "1"})

# Flask 애플리케이션 실행
if __name__ == '__main__':
    logging.info("Flask 애플리케이션 시작")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)