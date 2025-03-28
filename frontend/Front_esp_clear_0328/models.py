from argon2 import PasswordHasher
import mysql.connector
from argon2.exceptions import VerifyMismatchError, VerificationError
import requests,time

class DBManager:
    def __init__(self):
        self.ph = PasswordHasher()
        self.connection = None
        self.cursor = None

    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host="43.200.82.186",
                user="badpotato",
                password="1234",
                database="defect_detection"
            )
            self.cursor = self.connection.cursor(dictionary=True)
        except mysql.connector.Error as error:
            print(f"데이터베이스 연결 실패: {error}")

    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.cursor.close()
            self.connection.close()

    def insert_user(self, username, emp_no, userid, password, userPhone, userEmail):
        try:
            self.connect()
            # insert_user 내부에서 한 번 해싱
            hashed_password = self.ph.hash(password)
            sql = "INSERT INTO users (username, emp_no, userid, password, userLevel, userPhone, userEmail, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())"
            self.cursor.execute(sql, (username, emp_no, userid, hashed_password, 0, userPhone, userEmail))
            self.connection.commit()
            return True, None
        except mysql.connector.Error as error:
            return False, str(error)
        finally:
            self.disconnect()

    def validate_login(self, userid, password):
        stored_hash = self.get_user_password_hash(userid)  # 데이터베이스에서 해시 가져오기
        if stored_hash is None:
            return False, "사용자를 찾을 수 없습니다."

        try:
            # 공백 제거 후 비밀번호 검증
            if self.ph.verify(stored_hash, password.strip()):
                username = self.get_username(userid)  # 사용자 이름 가져오기
                return True, {'userid': userid, 'username': username}
        except (VerifyMismatchError, VerificationError):
            # 비밀번호가 틀린 경우
            return False, "비밀번호 불일치"
        except Exception as e:
            print(f"해시 검증 중 오류 발생: {e}")
            return False, "비밀번호 검증 오류"

    def get_user_password_hash(self, userid):
        try:
            self.connect()
            sql = "SELECT password FROM users WHERE userid = %s"
            self.cursor.execute(sql, (userid,))
            result = self.cursor.fetchone()
            return result['password'] if result else None
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def get_user_password(self, userid):
        """ 데이터베이스에서 특정 userid의 비밀번호 해시 가져오기 """
        try:
            self.connect()
            sql = "SELECT password FROM users WHERE userid = %s"
            self.cursor.execute(sql, (userid,))
            result = self.cursor.fetchone()  # 결과 가져오기

            if result is None:
                print(f"로그인 실패: userid={userid}가 DB에 존재하지 않음")
                return None

            return result['password']  # dictionary의 'password' 키로 접근
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def get_username(self, userid):
        try:
            self.connect()
            sql = "SELECT username FROM users WHERE userid = %s"
            self.cursor.execute(sql, (userid,))
            result = self.cursor.fetchone()
            return result['username'] if result else None
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def get_user_info(self, userid):
        """ 데이터베이스에서 특정 userid의 사용자 정보를 가져오기 (userid와 username) """
        try:
            self.connect()
            sql = "SELECT userid, username, userLevel, refusal, removed FROM users WHERE userid = %s"
            self.cursor.execute(sql, (userid,))
            result = self.cursor.fetchone()
            return result if result else None
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def check_user_id_exists(self, user_id):
        try:
            self.connect()
            sql = "SELECT COUNT(*) as count FROM users WHERE userid = %s"
            self.cursor.execute(sql, (user_id,))
            result = self.cursor.fetchone()
            if result is None:
                return False
            return result['count'] > 0
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()
    
    # 비밀번호 찾기 시 사용자 정보 가져오기
    def find_user(self, username, userid, userPhone):
        try:
            self.connect()
            sql = "SELECT userid, username FROM users WHERE userid = %s AND username = %s AND userPhone = %s"
            self.cursor.execute(sql, (userid, username, userPhone))
            result = self.cursor.fetchone()
            # print(f"Query result: {result}")  # 쿼리 결과 출력
            return result
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()
            
    # 비밀번호 업데이트
    def update_password(self, userid, new_password):
        """ 사용자 비밀번호를 업데이트합니다. """
        try:
            self.connect()
            
            # 🔹 비밀번호가 이미 해싱된 상태인지 확인
            if new_password.startswith("$argon2id$"):
                final_password = new_password  # 이미 해싱된 경우 그대로 저장
            else:
                final_password = self.ph.hash(new_password.strip())  # 해싱되지 않은 경우에만 해싱

            sql = "UPDATE users SET password = %s WHERE userid = %s"
            self.cursor.execute(sql, (final_password, userid))
            self.connection.commit()

            # print(f"비밀번호 업데이트 완료: {userid} -> {final_password}")  # 디버깅 로그
            return True
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()
            
    # 마이페이지 
    def get_member_mypage(self, userid):
        try:
            self.connect()
            sql = "SELECT * FROM users WHERE userid = %s"
            value = (userid,) # 튜플 1개 일때
            self.cursor.execute(sql, value)
            return self.cursor.fetchone()
        except mysql.connector.Error as error:
            print(f"내용 조회 실패: {error}")
            return None
        finally:
            self.disconnect()
    
    
    # 마이페이지 회원정보 수정 (회원레벨 포함)
    def update_member_info(self, userid, emp_no, password=None, userPhone=None, userEmail=None, userLevel=None):
        """ 회원정보 수정 (사번, 비밀번호(선택), 전화번호, 이메일, 회원레벨(선택)) """
        try:
            self.connect()

            sql_parts = []
            values = []

            if emp_no:
                sql_parts.append("emp_no = %s")
                values.append(emp_no)

            if password:
                sql_parts.append("password = %s")
                values.append(password)

            if userPhone:
                sql_parts.append("userPhone = %s")
                values.append(userPhone)

            if userEmail:
                sql_parts.append("userEmail = %s")
                values.append(userEmail)

            if userLevel is not None:
                sql_parts.append("userLevel = %s")
                values.append(userLevel)

            if not sql_parts:
                print("업데이트할 필드가 없습니다.")
                return False

            sql = f"UPDATE users SET {', '.join(sql_parts)} WHERE userid = %s"
            values.append(userid)

            self.cursor.execute(sql, tuple(values))
            self.connection.commit()
            print(f"회원정보 업데이트 완료: {userid}")

            return True

        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False

        finally:
            self.disconnect()

    
    # 관리자 영역 - 관리자 제외하기 
    def update_user_level(self, userid, new_level):
        """ 회원 권한 레벨 업데이트 """
        try:
            self.connect()

            sql = """
                UPDATE users
                SET userLevel = %s
                WHERE userid = %s
            """
            values = (new_level, userid)

            self.cursor.execute(sql, values)
            self.connection.commit()
            print(f"회원 권한 레벨 업데이트 완료: {userid} - 새로운 레벨: {new_level}")

            return True
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()
    
            
    # 회원 탈퇴 메서드
    def withdraw_member(self, userid):
        """ 회원 탈퇴 (removed 컬럼을 1로 설정) """
        try:
            self.connect()

            sql = """
                UPDATE users
                SET removed = 1
                WHERE userid = %s
            """
            values = (userid,)

            self.cursor.execute(sql, values)
            self.connection.commit()
            print(f"회원 탈퇴 완료: {userid}")

            return True
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()

    def get_admins(self):
        """관리자 (userLevel >= 100) 조회"""
        try:
            self.connect()

            sql = "SELECT * FROM users WHERE userLevel >= %s order by userLevel desc"
            values = (100,)
            self.cursor.execute(sql, values)
            result = self.cursor.fetchall()
            # print(f"Admins: {result}")  # 디버깅용 출력

            return result
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def get_pending_members(self):
        """가입 승인 대기 회원 (userLevel == 0) 조회"""
        try:
            self.connect()

            sql = "SELECT * FROM users WHERE userLevel = %s and refusal = 0"
            values = (0,)
            self.cursor.execute(sql, values)
            result = self.cursor.fetchall()
            # print(f"Pending Members: {result}")  # 디버깅용 출력

            return result
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def get_all_members(self):
        """전체 회원 조회"""
        try:
            self.connect()

            sql = "SELECT * FROM users where refusal = 0 and removed = 0 ORDER BY created_at desc"
            self.cursor.execute(sql)
            result = self.cursor.fetchall()
            # print(f"All Members: {result}")  # 디버깅용 출력

            return result
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()

    def check_user(self, username=None, userid=None, userPhone=None):
        """특정 회원 조회"""
        try:
            self.connect()
            
            # WHERE 절 동적 생성
            conditions = []
            params = []
            
            if userid is not None:
                conditions.append("userid = %s")
                params.append(userid)
            
            if username is not None:
                conditions.append("username = %s")
                params.append(username)
            
            if userPhone is not None:
                conditions.append("userPhone = %s")
                params.append(userPhone)

            # 쿼리 문자열 생성
            if conditions:
                sql = f"SELECT userid, username FROM users WHERE {' AND '.join(conditions)}"
            else:
                print("조건이 없습니다.")
                return None
            
            self.cursor.execute(sql, tuple(params))
            result = self.cursor.fetchone()
            # print(f"Query result: {result}")  # 쿼리 결과 출력

            return result
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None
        finally:
            self.disconnect()
            
    # 회원 승인 (userLevel을 1로 변경)
    def approve_member(self, userid):
        try:
            self.connect()
            sql = "UPDATE users SET userLevel = %s WHERE userid = %s"
            self.cursor.execute(sql, (1, userid))
            self.connection.commit()
            print(f"회원 승인 완료: {userid}")
            return True
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()

    # 가입 거절 처리 (refusal 값을 1로 변경)
    def refuse_member(self, userid):
        try:
            self.connect()
            sql = "UPDATE users SET refusal = 1, removed = 1 WHERE userid = %s"
            self.cursor.execute(sql, (userid,))
            self.connection.commit()
            print(f"회원 가입 거절 완료: {userid}")
            return True
        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return False
        finally:
            self.disconnect()
    

    def search_members(self, userid=None, username=None, emp_no=None):
        """ 회원 검색 메서드 """
        try:
            self.connect()

            # 조건에 따라 동적으로 WHERE 절 생성
            query_conditions = []
            query_values = []

            if userid:
                query_conditions.append("userid LIKE %s")
                query_values.append(f"%{userid}%")

            if username:
                query_conditions.append("username LIKE %s")
                query_values.append(f"%{username}%")

            if emp_no:
                query_conditions.append("emp_no LIKE %s")
                query_values.append(f"%{emp_no}%")

            sql = "SELECT * FROM users WHERE refusal = 0 AND removed = 0"
            if query_conditions:
                sql += " AND " + " AND ".join(query_conditions)

            # print(f"SQL 쿼리: {sql}")  # 디버깅용 로그
            # print(f"쿼리 값: {query_values}")  # 디버깅용 로그

            self.cursor.execute(sql, tuple(query_values))
            results = self.cursor.fetchall()

            return results

        except mysql.connector.Error as error:
            print(f"DB 오류 발생: {str(error)}")
            return None

        finally:
            self.disconnect()

    
