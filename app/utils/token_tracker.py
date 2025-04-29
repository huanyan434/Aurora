import json
import os
import time
from datetime import datetime
from flask import current_app

# token记录文件路径
TOKEN_USAGE_FILE = 'token_usage.json'

def get_token_file_path():
    """获取token使用记录文件的路径"""
    instance_path = current_app.instance_path
    return os.path.join(instance_path, TOKEN_USAGE_FILE)

def record_token_usage(user_id, prompt_tokens, completion_tokens, model_name):
    """
    记录token使用情况到JSON文件
    
    参数:
        user_id: 用户ID
        prompt_tokens: 请求token数
        completion_tokens: 响应token数
        model_name: 使用的模型名称
    """
    try:
        # 获取文件路径
        file_path = get_token_file_path()
        
        # 准备记录数据
        current_time = datetime.now().isoformat()
        new_record = {
            "user_id": user_id,
            "timestamp": current_time,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "model": model_name
        }
        
        # 读取现有数据
        usage_data = []
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    usage_data = json.load(f)
            except json.JSONDecodeError:
                # 文件损坏，重新开始
                usage_data = []
        
        # 添加新记录
        usage_data.append(new_record)
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(usage_data, f, ensure_ascii=False, indent=2)
            
        return True
    except Exception as e:
        print(f"记录token使用情况时出错: {e}")
        return False

def get_token_usage_stats():
    """
    获取token使用统计信息
    
    返回:
        dict: 包含总tokens、过去24小时tokens等统计信息
    """
    try:
        file_path = get_token_file_path()
        if not os.path.exists(file_path):
            return {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "records_count": 0
            }
            
        with open(file_path, 'r', encoding='utf-8') as f:
            usage_data = json.load(f)
            
        # 计算总token数
        total_tokens = sum(record.get("total_tokens", 0) for record in usage_data)
        prompt_tokens = sum(record.get("prompt_tokens", 0) for record in usage_data)
        completion_tokens = sum(record.get("completion_tokens", 0) for record in usage_data)
        
        # 过去24小时的token使用量
        now = datetime.now()
        day_ago = now.timestamp() - 86400  # 24小时 = 86400秒
        
        recent_records = [
            record for record in usage_data
            if datetime.fromisoformat(record["timestamp"]).timestamp() > day_ago
        ]
        
        recent_tokens = sum(record.get("total_tokens", 0) for record in recent_records)
        
        # 按用户分组的统计
        user_stats = {}
        for record in usage_data:
            user_id = record.get("user_id", "unknown")
            if user_id not in user_stats:
                user_stats[user_id] = 0
            user_stats[user_id] += record.get("total_tokens", 0)
        
        # 按模型分组的统计
        model_stats = {}
        for record in usage_data:
            model = record.get("model", "unknown")
            if model not in model_stats:
                model_stats[model] = 0
            model_stats[model] += record.get("total_tokens", 0)
        
        return {
            "total_tokens": total_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "records_count": len(usage_data),
            "recent_24h_tokens": recent_tokens,
            "user_stats": user_stats,
            "model_stats": model_stats
        }
    except Exception as e:
        print(f"获取token使用统计时出错: {e}")
        return {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "records_count": 0,
            "error": str(e)
        }

def get_latest_token_usage(user_id):
    """
    获取指定用户最新的token使用记录
    
    参数:
        user_id: 用户ID
        
    返回:
        dict: 包含prompt_tokens、completion_tokens等信息的字典，如果没有找到记录则返回None
    """
    try:
        file_path = get_token_file_path()
        if not os.path.exists(file_path):
            return None
            
        with open(file_path, 'r', encoding='utf-8') as f:
            usage_data = json.load(f)
        
        # 筛选出指定用户的记录并按时间戳排序
        user_records = [
            record for record in usage_data
            if str(record.get("user_id", "")) == str(user_id)
        ]
        
        if not user_records:
            return None
            
        # 按时间戳排序，获取最新记录
        user_records.sort(
            key=lambda x: datetime.fromisoformat(x["timestamp"]).timestamp(),
            reverse=True
        )
        
        return user_records[0]
    except Exception as e:
        print(f"获取用户最新token使用记录时出错: {e}")
        return None

def get_user_daily_model_usage(user_id, model_name):
    """
    获取用户今天使用特定模型的次数
    
    参数:
        user_id: 用户ID
        model_name: 模型名称
        
    返回:
        int: 今天使用该模型的次数
    """
    try:
        from datetime import datetime, time
        
        # 获取今天的起始时间（UTC+8时区，0点）
        today = datetime.now().date()
        today_start_utc = datetime.combine(today, time(0, 0, 0))
        
        # 读取token使用记录
        file_path = get_token_file_path()
        if not os.path.exists(file_path):
            return 0
            
        with open(file_path, 'r', encoding='utf-8') as f:
            usage_data = json.load(f)
        
        # 筛选出今天该用户使用特定模型的记录
        today_records = [
            record for record in usage_data
            if str(record.get("user_id", "")) == str(user_id) and
            record.get("model", "") == model_name and
            datetime.fromisoformat(record["timestamp"]).date() == today
        ]
        
        # 返回今天使用的次数
        return len(today_records)
    except Exception as e:
        print(f"获取用户每日模型使用次数出错: {e}")
        return 0

def get_model_free_usage_limit(model_name):
    """
    获取模型的每日免费使用次数
    
    参数:
        model_name: 模型名称
        
    返回:
        int: 每日免费使用次数限制
    """
    from app.routes.func import model_name_reverse
    model_name = model_name_reverse(model_name)
    # 定义每个模型的每日免费使用次数
    free_usage_limits = {
        # 默认为5次
        "default": 5,
        # 具体模型可以有不同限制
        "DeepSeek-R1": 20,
        "DeepSeek-V3": 50,
        "Doubao-1.5-lite": 10, 
        "Doubao-1.5-pro": 10,
        "Doubao-1.5-pro-256k": 5,
        "Doubao-1.5-vision-pro": 5,
        "Gemini-2.5-pro": 30,
        "Gemini-2.5-flash": 30,
        "Gemini-2.0-flash": 30,
    }
    
    # 如果模型名称在定义的限制中，返回对应的限制，否则返回默认值
    return free_usage_limits.get(model_name, free_usage_limits["default"]) 