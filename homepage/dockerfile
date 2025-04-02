# 베이스 이미지로 Python 3.10 slim 버전을 사용 (이미지 크기 최소화)
FROM python:3.10-slim

# 컨테이너 내 작업 디렉토리를 /app으로 설정
WORKDIR /app

# 의존성 설치: 설치 순서에 따라 충돌 방지를 위해 개별적으로 설치
# 1단계: numpy 설치 (딥러닝 라이브러리 의존성 충돌 방지)
RUN pip install --no-cache-dir numpy==1.26.4

# 2단계: tensorflow와 keras 설치 (딥러닝 모델 실행을 위한 필수 패키지)
RUN pip install --no-cache-dir tensorflow==2.18.0 keras==3.8.0

# 3단계: ultralytics 설치 (YOLO 모델 사용을 위한 패키지)
RUN pip install --no-cache-dir ultralytics==8.2.86

# 4단계: mysql-connector-python과 protobuf 설치 (데이터베이스 연결 및 의존성 패키지)
RUN pip install --no-cache-dir mysql-connector-python==9.2.0 protobuf==5.29.3

# 5단계: 나머지 패키지 설치 (requirements-docker.txt에 명시된 패키지들)
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# 프로젝트 파일 전체를 컨테이너의 /app 디렉토리로 복사
COPY . .

# 컨테이너가 사용할 포트를 노출 (서버에서 5050 포트 사용)
EXPOSE 5050

# 컨테이너 실행 시 Gunicorn으로 Flask 앱 실행 (5050 포트로 설정)
CMD ["gunicorn", "--bind", "0.0.0.0:5050", "app:app"]