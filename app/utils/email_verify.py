import dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
import random
import string
import json
import time

def send_email(email: str, subject: str, content: str):
    # 加载环境变量
    _ = dotenv.load_dotenv(dotenv.find_dotenv())

    try:
        # 邮件发送者邮箱地址和授权码
        sender_email = os.environ['sender_email']
        sender_password = os.environ['sender_password']
        smtp_server = os.environ['smtp_server']
    except Exception as e:
        print(f"加载环境变量失败: {e}")
        return True

    # 发送邮件
    try:
        # 邮件内容
        message = MIMEText(content, 'plain', 'utf-8')
        message['From'] = formataddr(("Aurora", sender_email))
        message['To'] = formataddr(("Aurora 用户", email))
        message['Subject'] = Header(subject, 'utf-8')
        smtpObj = smtplib.SMTP(smtp_server, 25)
        smtpObj.login(sender_email, sender_password)
        smtpObj.sendmail(sender_email, [email], message.as_string())
        smtpObj.quit()
        print("邮件发送成功")
        return True
    except smtplib.SMTPException:
        print("无法发送邮件")
        return False


def email_verify_send(email):
    # 生成验证码 数字
    code = random.randint(100000, 999999)
    # 发送验证码到邮箱
    send_email(email, 'Aurora 验证码', f'您的验证码是：{code}，请勿告诉他人，15分钟内有效。')
    # 保存 log
    with open('email_verify.log', 'w+') as f:
        log = f.read()
        if log:
            try:
                # 解析
                codes = json.load(log)
            except Exception as e:
                print(f'log解析失败{str(e)}')
        else:
            codes = []
        
        codes.append({'email': email, 'code': code, 'time': time.time()})
        # 保存最近一次发送时间和验证码，json格式
        f.write(str(codes))
        f.close()

def verify_email(email, code):
    with open('email_verify.log', 'r') as f:
        log = f.read()
        if log:
            try:
                # 解析
                codes = json.load(log)
            except Exception as e:
                print(f'log解析失败{str(e)}')
                return False
        else:
            return False

        for c in codes:
            if c['email'] == email and c['code'] == code and time.time() - c['time'] < 900:
                return True

if __name__ == "__main__":
    email_verify_send('huanyan434@outlook.com')