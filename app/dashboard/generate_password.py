#!/usr/bin/env python
"""
仪表盘密码生成工具

使用方法:
python generate_password.py
"""

import json
import os
import sys
from werkzeug.security import generate_password_hash

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dashboard_config_path = os.path.join(script_dir, 'dashboard.json')
    
    # 获取密码
    print("=== 仪表盘密码生成工具 ===")
    print("注意: 此工具将生成一个新的仪表盘密码并更新配置文件。")
    
    # 询问密码
    while True:
        password = input("请输入新的仪表盘密码 (至少6个字符): ")
        if len(password) < 6:
            print("错误: 密码必须至少包含6个字符")
            continue
            
        confirm_password = input("请再次输入密码以确认: ")
        if password != confirm_password:
            print("错误: 两次输入的密码不匹配")
            continue
            
        break
    
    # 生成密码哈希
    password_hash = generate_password_hash(password)
    
    # 创建或更新配置文件
    config = {}
    if os.path.exists(dashboard_config_path):
        try:
            with open(dashboard_config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            print(f"读取配置文件出错: {str(e)}")
    
    # 更新密码哈希
    config['password_hash'] = password_hash
    
    # 保存配置
    try:
        with open(dashboard_config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
        print("成功: 仪表盘密码已更新")
        print(f"配置文件已保存到: {dashboard_config_path}")
    except Exception as e:
        print(f"保存配置文件出错: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 