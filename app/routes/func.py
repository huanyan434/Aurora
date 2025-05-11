from openai import OpenAI
from dotenv import load_dotenv, find_dotenv
import os
import re
import json
import time
import copy
import threading
import queue
from app.history import save_history, load_history
from app.utils.token_tracker import record_token_usage, get_latest_token_usage, get_user_daily_model_usage, get_model_free_usage_limit
from flask_login import current_user
from flask import current_app
from datetime import datetime

# 全局变量，用于存储正在进行的响应
active_responses = {}
response_queues = {}
response_locks = {}
response_status = {}  # 状态: 'running', 'finished', 'error'

# 当前用户ID全局变量
current_user_id = None

global search_tools
search_tools = [
    {
        "type": "function",
        "function": {
            "name": "online_search",
            "description": "联网搜索（在互联网上搜索信息）",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索的关键词",
                    },
                    "num": {
                        "type": "int",
                        "description": "搜索结果的数量（默认10条）",
                    },
                },
                "required": ["query"],
            },
        }
    }
]
global other_tools
other_tools = [
    {
        "type": "function",
        "function": {
            "name": "get_time",
            "description": "获取当前时间",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        }
    }
]
def get_time() -> str:
    return f"当前时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

def model_name(model: str):
    # DeepSeek
    if model == "DeepSeek-R1":
        model = "deepseek-ai/DeepSeek-R1"
    elif model == "DeepSeek-V3":
        model = "deepseek-ai/DeepSeek-V3"
    # Doubao
    elif model == "Doubao-1.5-lite":
        model = "doubao-1-5-lite-32k-250115"
    elif model == "Doubao-1.5-pro":
        model = "doubao-1-5-pro-32k-250115"
    elif model == "Doubao-1.5-pro-256k":
        model = "doubao-1-5-pro-256k-250115"
    elif model == "Doubao-1.5-vision-pro":
        model = "doubao-1-5-vision-pro-32k-250115"
    # Gemini
    elif model == "Gemini-2.5-pro":
        model = "gemini-2.5-pro-exp-03-25"
    elif model == "Gemini-2.5-flash":
        model = "gemini-2.5-flash-preview-04-17"
    elif model == "Gemini-2.0-flash":
        model = "gemini-2.0-flash"
    # Qwen
    elif model == "Qwen3":
        model = "Qwen/Qwen3-235B-A22B"
    elif model == "QwQ":
        model = "Qwen/QwQ-32B"
    elif model == "QwQ-Preview":
        model = "Qwen/QwQ-32B-Preview"
    elif model == "QvQ":
        model = "Qwen/QVQ-72B-Preview"
    elif model == "Qwen2.5-Instruct":
        model = "Qwen/Qwen2.5-72B-Instruct"
    return model
def model_name_reverse(model: str):
    if model == "deepseek-ai/DeepSeek-R1":
        model = "DeepSeek-R1"
    elif model == "deepseek-ai/DeepSeek-V3":
        model = "DeepSeek-V3"
    elif model == "doubao-1-5-lite-32k-250115":
        model = "Doubao-1.5-lite"
    elif model == "doubao-1-5-pro-32k-250115":
        model = "Doubao-1.5-pro"
    elif model == "doubao-1-5-pro-256k-250115":
        model = "Doubao-1.5-pro-256k"
    elif model == "doubao-1-5-vision-pro-32k-250115":
        model = "Doubao-1.5-vision-pro"
    elif model == "gemini-2.5-pro-exp-03-25":
        model = "Gemini-2.5-pro"
    elif model == "gemini-2.5-flash-preview-04-17":
        model = "Gemini-2.5-flash"
    elif model == "gemini-2.0-flash":
        model = "Gemini-2.0-flash"
    elif model == "Qwen/Qwen3-235B-A22B":
        model = "Qwen3"
    elif model == "Qwen/QwQ-32B":
        model = "QwQ"
    elif model == "Qwen/QwQ-32B-Preview":
        model = "QwQ-Preview"
    elif model == "Qwen/Qwen2.5-72B-Instruct":
        model = "Qwen2.5-Instruct"
    return model

def stream_openai_api(api_key: str, url: str, model: str, history: list, response_queue, online_search: bool=False) -> str:
    client = OpenAI(
        api_key=api_key,
        base_url=url,
        timeout=1800,
    )
    # 收集流式响应内容
    reasoning_content = ""
    content = ""
    first_reasoning_character = True
    first_content_character = True
    search = ""
    try:
        if online_search:
            try:
                func = function_calling(history, search_tools)
                if func[1] == "online_search" and func[2] and func[3]:
                    # 创建流式响应
                    response = client.chat.completions.create(
                        model=model,
                        messages=[{
                            'role': 'system',
                            'content': '''- 刚刚你已经调用过联网搜索工具。
- 优先参考「联网」中的信息进行回复。
- 回复请使用清晰、结构化（序号/分段等）的语言，确保用户轻松理解和使用。
- 回复时，避免提及信息来源或参考资料。'''
                        }] + func[0],
                        stream=True
                    )
                    search_result = func[3]
                    search_result = search_result['results']
                    r = []
                    for result in search_result:
                        r.append({"href":result['href'], "title":result['title']})
                    search = "<search>" + json.dumps(r) + "</search>"
                    #print(search)
                    response_queue.put(search)
                else:
                    # 创建流式响应
                    response = client.chat.completions.create(
                        model=model,
                        messages=history,
                        stream=True,
                    )
            except Exception as e:
                print(f"OpenAI 联网搜索出错: {str(e)}")
        else:
            # 创建流式响应
            response = client.chat.completions.create(
                model=model,
                messages=history,
                stream=True,
            )

        start_time = time.time()

        for chunk in response:
            if hasattr(
                    chunk.choices[0].delta,
                    'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                if first_reasoning_character == True:
                    first_reasoning_character = False
                # 去除多余的换行符
                if chunk.choices[0].delta.reasoning_content[:2] == "\n":
                    reasoning_content += chunk.choices[0].delta.reasoning_content[2:]
                else:
                    reasoning_content += chunk.choices[0].delta.reasoning_content
                think_time = time.time() - start_time
                response_text = "<think time=" + \
                    str(int(think_time)) + ">" + reasoning_content + "</think>"
                response_queue.put(search + response_text)
            elif chunk.choices[0].delta.content:
                if first_content_character == True:
                    first_content_character = False
                    think_time = time.time() - start_time
                # 去除多余的换行符
                if reasoning_content[:2] == "\n":
                    reasoning_content += reasoning_content[2:]
                if chunk.choices[0].delta.content[:2] == "\n":
                    content += chunk.choices[0].delta.content[2:]
                else:
                    content += chunk.choices[0].delta.content

                if not reasoning_content.strip():
                    response_queue.put(search + content)
                else:
                    response_text = "<think time=" + \
                        str(int(think_time)) + ">" + reasoning_content + \
                        "</think>" + content
                    response_queue.put(search + response_text)

        # 获取token使用信息并记录
        global current_user_id
        user_id = current_user_id if current_user_id else 'anonymous'
        complete_response = client.chat.completions.create(
            model=model,
            messages=history,
            stream=False,
            max_tokens=1
        )
        prompt_tokens = complete_response.usage.prompt_tokens if hasattr(
            complete_response, 'usage') else 0
        completion_tokens = len(content) // 2

        try:
            from flask import has_app_context
            if has_app_context():
                record_token_usage(
                    user_id=user_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    model_name=model
                )
            else:
                from app import create_app
                app = create_app()
                with app.app_context():
                    record_token_usage(
                        user_id=user_id,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens,
                        model_name=model
                    )
        except Exception as e:
            print(f"记录token使用出错: {str(e)}")

        # 标记响应完成
        response_queue.put(None)
        return search + "<think time=" + \
            str(int(think_time)) + ">" + reasoning_content + \
            "</think>" + content
    except Exception as e:
        print(f"OpenAI API调用出错: {str(e)}")
        response_queue.put(f"<e>{str(e)}</e>")
        response_queue.put(None)
        return f"发生错误: {str(e)}"

def stream_volcano_ark_api(model: str, history: list, response_queue, online_search: bool=False) -> str:
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyA']
    return stream_openai_api(api_key, "https://ark.cn-beijing.volces.com/api/v3", model, history, response_queue, online_search)

def stream_siliconflow_api(model: str, history: list, response_queue, online_search: bool=False) -> str:
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyB']
    return stream_openai_api(api_key, "https://api.siliconflow.cn/v1", model, history, response_queue, online_search)

def function_calling(history: list, tools: list):
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyB']
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.siliconflow.cn/v1",
        timeout=1800,
    )
    try:
        response = client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages = [{
                'role': 'system',
                'content': '''- 对于需要补充外部信息才能回答的问题（或者需要补充外部信息才能更好地回答的问题），请调用联网搜索工具；
-  如果用户提问为天气类、新闻类、实时信息类等时效性问题，或提到[最近]，[今天]，[本周]，[这个月]，[几号]等时间信息，请调用联网搜索工具。
-  如果问题与联网搜索无关，或问题不需要额外信息帮助回答，仅输出「无需检索」'''
            }] + history,
            stream=False,
            tools=tools
        )
    except Exception as e:
        print(f"函数调用请求出错: {str(e)}")
        return history, "", "", ""
    try:
        if response.choices[0].message.tool_calls:
            try:
                func_name = response.choices[0].message.tool_calls[0].function.name
                func_args = response.choices[0].message.tool_calls[0].function.arguments
                func_out = eval(f'{func_name}(**{func_args})')
                history.append({
                'role': 'tool',
                'content': f'{func_out}',
                'tool_call_id': response.choices[0].message.tool_calls[0].id
                    })
                return history, func_name, func_args, func_out
            except Exception as e:
                print(f"函数调用执行出错: {str(e)}")
                return history, "", "", ""
        else:
            print("没有工具调用")
            return history, "", "", ""
    except Exception as e:
        print(f"函数调用执行出错: {str(e)}")
        return history, "", "", ""

def stream_gemini_api(model: str, history: list, response_queue, online_search: bool=False) -> str:
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyC']
    return stream_openai_api(api_key, "https://gemini.wanyim.cn/v1beta", model, history, response_queue, online_search)

def online_search(query: str, num: int = 10):
    """在线搜索"""
    import requests
    url = "https://duckduckgo.wanyim.cn/search"
    params = {
        "q": query,
        "max_results": num
    }
    response = requests.get(url, params)
    return response.json()

def autohistory(history: dict, model: str, response_queue, online_search: bool=False):
    """处理历史并调用对应API生成回复"""    
    # 创建历史记录的深拷贝，处理特殊标记
    his = copy.deepcopy(history)
    for i in his:
        if i['role'] == 'user':
            i['content'] = parse_base64_blocks(i['content'])
        elif i['role'] == 'assistant':
            i['content'] = parse_think_blocks(
                parse_search_blocks(
                parse_model_blocks(i['content']))[1])[1]

    # 保存原始模型名并转换为 API 调用格式
    model_orig = model
    api_model = model_name(model)

    # 选择正确的 API 并调用
    content = ""
    try:
        if "doubao" in api_model:
            content = stream_volcano_ark_api(api_model, his, response_queue, online_search)
        elif "gemini" in api_model:
            content = stream_gemini_api(api_model, his, response_queue, online_search)
        else:
            content = stream_siliconflow_api(api_model, his, response_queue, online_search)
    except Exception as e:
        print(f"API调用出错: {str(e)}")
        response_queue.put(f"<e>API调用失败: {str(e)}</e>")
        response_queue.put(None)
        content = f"处理请求时出错: {str(e)}"

    history.append({"role": "assistant",
                    "content": f"<model=\"{model_orig}\"/>" + str(content)})
    return history


def parse_think_blocks(text):
    """解析思考块，返回思考内容和剩余文本"""
    import re

    # 处理None或空字符串
    if not text:
        return None, ""

    # 匹配 <think time=数字>内容</think> 格式
    think_pattern = r'<think time=(\d+)>(.*?)</think>'
    match = re.search(think_pattern, text, re.DOTALL)

    if not match:
        return None, text

    # 提取思考时间和内容
    think_time = match.group(1)
    think_content = match.group(2).strip()

    # 构造新的思考内容格式 - 确保包含完整的标签
    think_block = f"<think time={think_time}>{think_content}</think>"

    # 获取剩余文本（去除思考块的部分）
    remaining_text = text[:match.start()] + text[match.end():]

    return think_block, remaining_text.strip()


def parse_image_blocks(text):
    """解析图片块，返回剩余文本"""
    import re

    # 如果输入为None或空字符串，直接返回空字符串
    if not text:
        return ""

    # 匹配 <image>内容</image> 格式
    think_pattern = r'<image>(.*?)</image>'
    match = re.search(think_pattern, text, re.DOTALL)

    if not match:
        return text

    # 获取剩余文本
    remaining_text = text[:match.start()] + text[match.end():]

    return remaining_text.strip()


def parse_base64_blocks(text):
    """解析base64块，返回剩余文本"""
    import re

    # 如果输入为None或空字符串，直接返回空字符串
    if not text:
        return ""

    # 匹配 <base64>内容</base64> 格式
    think_pattern = r'<base64>(.*?)</base64>'
    match = re.search(think_pattern, text, re.DOTALL)

    if not match:
        return text

    # 获取剩余文本
    remaining_text = text[:match.start()] + text[match.end():]

    return remaining_text.strip()


def parse_model_blocks(text):
    """解析模型块，返回剩余文本"""
    import re

    # 如果输入为None或空字符串，直接返回空字符串
    if not text:
        return ""

    # 匹配 <model="内容"> 格式
    think_pattern = r'<model="(.*?)"/>'
    match = re.search(think_pattern, text, re.DOTALL)

    if not match:
        return text

    # 获取剩余文本
    remaining_text = text[:match.start()] + text[match.end():]

    return remaining_text.strip()

def parse_search_blocks(text):
    """解析搜索块，返回搜索内容和剩余文本"""
    import re

    # 处理None或空字符串
    if not text:
        return None, ""

    # 匹配 <think time=数字>内容</think> 格式
    think_pattern = r'<search>(.*?)<\\/search>'
    match = re.search(think_pattern, text, re.DOTALL)

    if not match:
        return None, text

    # 提取搜索内容
    search_content = match.group(1).strip()

    # 构造新的搜索内容格式 - 确保包含完整的标签
    search_block = f"<search>{search_content}</search>"

    # 获取剩余文本（去除思考块的部分）
    remaining_text = text[:match.start()] + text[match.end():]

    return search_block, remaining_text.strip()

def generate_thread(
        message_id,
        prompt,
        conversation_id,
        model,
        image_base64=None,
        user_id=None,
        online_search=False):
    """生成响应的线程函数"""
    # 初始化队列和状态
    response_queues[message_id] = queue.Queue()
    response_status[message_id] = 'running'

    # 设置为全局变量以便其他函数可以访问
    global current_user_id
    if user_id is None:
        user_id = 'anonymous'
    current_user_id = user_id

    # 导入必要模块
    from flask import has_app_context

    # 创建应用实例和上下文
    app = None
    try:
        # 尝试导入应用模块并创建应用实例
        from app import create_app
        app = create_app()
    except Exception as app_err:
        print(f"创建应用实例失败: {str(app_err)}")
        response_status[message_id] = 'error'
        if message_id in response_queues:
            response_queues[message_id].put(
                f"<e>应用上下文创建失败: {str(app_err)}</e>")
            response_queues[message_id].put(None)  # 发送结束标记
        return

    # 使用创建的应用上下文执行所有操作
    with app.app_context():
        try:
            # 获取正确的数据库实例
            from app import db
            
            # 检查用户余额和免费次数（如果是登录用户）
            will_charge = False
            if user_id != 'anonymous':
                from app.models import User
                from app.utils.token_tracker import get_user_daily_model_usage, get_model_free_usage_limit
                
                # 获取用户 - 转换为UUID，如果可能
                import uuid
                try:
                    if isinstance(user_id, str) and not user_id.isdigit():
                        user_uuid = uuid.UUID(user_id)
                        user = User.query.get(user_uuid)
                    else:
                        user = User.query.get(user_id)
                except (ValueError, TypeError):
                    # 如果用户ID不是有效的UUID，继续处理但记录错误
                    print(f"无效的用户ID格式: {user_id}")
                    user = None
                
                # 打印详细的用户信息
                if user:
                    print(f"用户信息: ID={user.id}, 名称={user.username}, 会员={user.is_member}, 等级={user.member_level}")
                    print(f"会员截止日期={user.member_until}, 当前时间={datetime.now()}")
                    print(f"会员是否有效: {user.is_active_member()}")
                
                # 检查用户权限
                if user:
                    # SVIP用户：无限使用，不计费
                    if user.is_member and user.member_level and user.member_level.lower() == 'svip' and user.is_active_member():
                        print(f"SVIP用户{user.username}(ID:{user.id})允许无限使用所有模型")
                        will_charge = False  # 不计费
                    else:
                        # 非SVIP用户：检查免费次数
                        current_usage = get_user_daily_model_usage(user_id, model)
                        free_limit = get_model_free_usage_limit(model, user_id)
                        
                        if current_usage >= free_limit:
                            # 超出免费次数：检查余额
                            will_charge = True
                            if user.balance <= 0:
                                response_status[message_id] = 'error'
                                if message_id in response_queues:
                                    response_queues[message_id].put(
                                        f"<e>您今日免费使用次数已用完，且余额不足，请充值后继续使用</e>")
                                    response_queues[message_id].put(None)
                                    return
                            else:
                                print(f"用户{user.username}免费次数已用完，将使用余额，当前余额: {user.balance}")
                        else:
                            # 还有免费次数
                            will_charge = False
                            print(f"用户{user.username}今日使用{model}的第{current_usage+1}次，免费次数上限为{free_limit}")
                else:
                    # 匿名用户，不许继续请求
                    response_status[message_id] = 'error'
                    if message_id in response_queues:
                        response_queues[message_id].put(f"<e>匿名用户请求</e>")
                        response_queues[message_id].put(None)
                    return
            
            # 保存原始模型名
            model_orig = model
            # 转换模型名为API所需格式
            model = model_name(model)

            # 确保prompt不为None
            if prompt is None:
                prompt = ""

            # 加载历史记录
            try:
                history = load_history(conversation_id)
                print(f"成功加载历史记录，条数: {len(history)}")
            except Exception as e:
                print(f"加载历史记录出错: {str(e)}")
                history = []  # 出错时使用空历史

            # 调用图片解析
            if image_base64 and not "gemini" in model:
                describe = qwen_parse_image(image_base64)
                prompt = prompt + \
                    f"\n\n<image>用户上传了一张图片，你可以查看图片描述：{describe}</image>\n\n<base64>{image_base64}</base64>"
            elif image_base64 and "gemini" in model:
                prompt = [{"type": "image_url",
                          "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                         {"type": "text",
                          "content": prompt}]
            # 增加用户消息到历史记录
            history.append({"role": "user", "content": prompt})
            # 保存历史记录
            try:
                save_history(conversation_id, history)
                print(f"成功保存历史记录，条数: {len(history)}")
            except Exception as e:
                print(f"保存历史记录出错: {str(e)}")
            
            if online_search:
                try:
                    updated_history = autohistory(
                    history, model_orig, response_queues[message_id], online_search)
                except Exception as e:
                    print(f"联网搜索出错: {str(e)}")
                    response_status[message_id] = 'error'
                    if message_id in response_queues:
                        response_queues[message_id].put(f"<e>联网搜索出错: {str(e)}</e>")
                        response_queues[message_id].put(None)
            else:
                # 使用线程安全的队列接收响应
                updated_history = autohistory(
                    history, model_orig, response_queues[message_id], online_search)
            # 标记响应完成
            response_status[message_id] = 'finished'
            # 保存历史记录
            try:
                save_history(conversation_id, updated_history)
                print(f"成功保存历史记录，条数: {len(updated_history)}")
            except Exception as e:
                print(f"保存历史记录出错: {str(e)}")
                
            # 扣费逻辑（如果用户已登录且需要扣费）
            if user_id != 'anonymous' and will_charge:
                try:
                    from app.models import User
                    # 获取用户 - 转换为UUID，如果可能
                    import uuid
                    try:
                        if isinstance(user_id, str) and not user_id.isdigit():
                            user_uuid = uuid.UUID(user_id)
                            user = User.query.get(user_uuid)
                        else:
                            user = User.query.get(user_id)
                    except (ValueError, TypeError):
                        # 如果用户ID不是有效的UUID，继续处理但记录错误
                        print(f"无效的用户ID格式: {user_id}")
                        user = None
                        
                    if user:
                        # 获取上次API调用的token使用量，从数据库或token记录中获取
                        usage = get_latest_token_usage(user_id)
                        if usage:
                            total_tokens = usage.get('prompt_tokens', 0) + usage.get('completion_tokens', 0)
                            
                            # 根据会员级别确定费率
                            if user.member_level == 'svip':
                                fee_rate = 0.0  # SVIP不收费
                            elif user.is_member and user.member_level == 'vip':
                                fee_rate = 0.0005  # VIP费率
                            else:
                                fee_rate = 0.001  # 普通用户费率
                            
                            # 计算费用并扣除（使用负数，因为扣费是减少余额）
                            fee = total_tokens * fee_rate
                            if fee > 0:
                                # 使用add_balance方法，但传入负值来扣费
                                # user.balance -= fee
                                user.add_balance(-fee)  # 使用负值扣费
                                db.session.commit()
                                print(f"用户{user.username}扣费成功，扣除{fee}元，当前余额{user.balance}元")
                except Exception as e:
                    print(f"扣费过程中出错: {str(e)}")
                    # 不中断用户体验，只记录错误

        except Exception as e:
            print(f"生成响应时出错: {str(e)}")
            response_status[message_id] = 'error'

            if message_id in response_queues:
                response_queues[message_id].put(f"<e>{str(e)}</e>")
                response_queues[message_id].put(None)  # 发送结束标记


def generate(
        message_id,
        prompt,
        conversation_id,
        model,
        image_base64=None,
        user_id=None,
        online_search=False):
    """启动生成响应的线程，并返回流式响应"""

    # 检查是否已有相同message_id的响应正在处理
    if message_id in response_status and response_status[message_id] == 'running':
        # 已经有线程在处理这个消息，直接使用现有队列
        print(f"消息 {message_id} 已经在处理中，连接到现有队列")

        # 返回连接成功信息，通知前端已成功连接到现有流
        yield json.dumps({
            "message_id": message_id,
            "text": "",
            "think": None,
            "connected": True
        }) + "\n"
    elif message_id in response_status and response_status[message_id] == 'finished':
        # 已经完成的请求，重新启动会创建错误，返回错误提示
        yield json.dumps({
            "message_id": message_id,
            "text": "此请求已经完成，请创建新的请求",
            "error": True
        }) + "\n"
        return
    else:
        # 如果是新的请求但没有提供prompt，也无法继续
        if not prompt and message_id not in response_status:
            if not image_base64:
                yield json.dumps({
                    "message_id": message_id,
                    "text": "缺少提示内容，无法继续",
                    "error": True
                }) + "\n"
            return

        # 启动新线程处理生成
        threading.Thread(
            target=generate_thread,
            args=(
                message_id,
                prompt,
                conversation_id,
                model,
                image_base64,
                user_id,
                online_search),
            daemon=True).start()

        # 返回已启动消息，通知前端请求已开始处理
        yield json.dumps({
            "message_id": message_id,
            "text": "",
            "think": None,
            "started": True
        }) + "\n"

    # 返回流式响应
    while True:
        try:
            # 如果消息ID不在队列中，可能是第一次连接，需要等待队列建立
            if message_id not in response_queues:
                time.sleep(0.1)
                continue

            # 从队列获取响应
            response = response_queues[message_id].get(timeout=30)  # 30秒超时

            # 如果收到None，表示响应结束
            if response is None:
                # 发送完成信号
                yield json.dumps({
                    "message_id": message_id,
                    "text": "",
                    "think": None,
                    "finished": True
                }) + "\n"
                break

            # 检查是否是错误消息
            if (response.startswith("<e>") and response.endswith("</e>")
                ) or (response.startswith("<e>") and response.endswith("</e>")):
                # 提取错误信息
                if response.startswith("<e>"):
                    error_msg = response[3:-4]  # 提取<e>...</e>中的错误信息
                else:
                    error_msg = response[7:-8]  # 提取<e>...</e>中的错误信息

                yield json.dumps({
                    "message_id": message_id,
                    "text": f"发生错误: {error_msg}",
                    "think": None,
                    "error": True
                }) + "\n"
                continue

            # 解析并格式化响应
            search_match = parse_search_blocks(response)
            remaining_response = search_match[1]
            parsed_think = parse_think_blocks(remaining_response)

            think_block = parsed_think[0]
            text_content = parsed_think[1]

            yield json.dumps({
                    "message_id": message_id,
                "text": text_content,
                "think": think_block,
                "search": search_match[0]
                }) + "\n"

        except queue.Empty:
            # 检查状态，如果已完成或出错但没有收到None，则退出
            if message_id in response_status and response_status[message_id] in [
                    'finished', 'error']:
                # 发送完成信号
                yield json.dumps({
                    "message_id": message_id,
                    "text": "",
                    "think": None,
                    "search": None, # 确保完成信号也包含search字段
                    "finished": True
                }) + "\n"
                break

            # 发送心跳以保持连接
            yield json.dumps({
                "message_id": message_id,
                "text": "",
                "think": None,
                "search": None, # 确保心跳信号也包含search字段
                "heartbeat": True
            }) + "\n"
            continue
        except Exception as e:
            print(f"流式响应过程中出错: {str(e)}")
            yield json.dumps({
                "message_id": message_id,
                "text": f"发生错误: {str(e)}",
                "think": None,
                "search": None, # 确保错误信号也包含search字段
                "error": True
            }) + "\n"
            break

    # 清理资源（根据需要决定是否保留以便客户端重连）
    # 如果状态是finished，可以在适当的时候清理资源
    if message_id in response_status and response_status[message_id] == 'finished':
        # 可以选择延迟清理，例如10分钟后
        def delayed_cleanup():
            time.sleep(600)  # 10分钟后
            if message_id in response_queues:
                del response_queues[message_id]
            if message_id in response_status:
                del response_status[message_id]

        threading.Thread(target=delayed_cleanup, daemon=True).start()


def get_active_responses():
    """获取当前所有活跃的响应状态，用于前端检查未完成的响应"""
    active = {}
    for msg_id, status in response_status.items():
        if status == 'running':
            active[msg_id] = {
                'status': status,
                'message_id': msg_id
            }
    return active


def get_model_free_usage_info(model_name, user_id=None):
    """获取模型的免费使用次数信息"""
    try:
        # 获取今天的使用次数
        current_usage = get_user_daily_model_usage(user_id, model_name) if user_id else 0
        # 获取免费使用次数限制（传入用户ID以获取正确的VIP限制）
        free_limit = get_model_free_usage_limit(model_name, user_id)
        
        # 处理无限次数的情况
        if free_limit == float('inf'):
            return {
                'success': True,
                'current': current_usage,
                'limit': -1,  # 使用-1表示无限
                'remaining': -1  # 使用-1表示无限
            }
            
        # 计算剩余免费次数
        remaining = max(0, free_limit - current_usage)
        
        return {
            'success': True,
            'current': current_usage,
            'limit': free_limit,
            'remaining': remaining
        }
    except Exception as e:
        print(f"获取用户每日模型使用次数出错: {e}")
        return {
            'success': False,
            'current': 0,
            'limit': get_model_free_usage_limit(model_name),  # 出错时使用基础限制
            'remaining': 0
        }


def qwen_parse_image(image_base64: str) -> str:
    """使用通义千问API的视觉功能解析图片"""
    try:
        _ = load_dotenv(find_dotenv())
        api_key = os.environ.get('api_keyB')
        if not api_key:
            print("未配置SiliconFlow API密钥，无法处理图片")
            return "无法解析图片，请检查API配置"

        # 初始化客户端
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.siliconflow.cn/v1",
            timeout=60
        )

        # 构建请求
        messages = [{"role": "user",
                     "content": [{"type": "image_url",
                                  "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                                 {"type": "text",
                                  "text": "请详细描述这张图片的内容，不要使用markdown格式，不要书名号。"}]}]

        # 发送请求 - 使用Qwen/Qwen2.5-VL-32B-Instruct作为视觉模型
        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-VL-32B-Instruct",
            messages=messages,
            max_tokens=1000
        )

        # 解析响应
        if response and response.choices and len(response.choices) > 0:
            description = response.choices[0].message.content

            # 获取token使用情况
            prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
            completion_tokens = getattr(response.usage, 'completion_tokens', 0)

            # 使用全局用户ID
            global current_user_id
            user_id = current_user_id or 'anonymous'

            # 记录token使用
            try:
                record_token_usage(
                    user_id=user_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    model_name='Qwen/Qwen2.5-VL-32B-Instruct'
                )
                print(
                    f"图片API Token记录 - 用户: {user_id}, 模型: Qwen/Qwen2.5-VL-32B-Instruct, 输入: {prompt_tokens}, 输出: {completion_tokens}")
            except Exception as e:
                print(f"记录token使用出错: {str(e)}")

            return description
        else:
            print("API响应无效")
            return "无法解析图片内容"

    except Exception as e:
        print(f"解析图片时出错: {str(e)}")
        return f"图片解析失败: {str(e)}"


def name_conversation(conversation_id):
    """根据对话内容生成标题"""
    # 导入必要的模块
    from flask import has_app_context

    # 创建应用实例和上下文
    app = None
    try:
        # 尝试导入应用模块并创建应用实例
        from app import create_app
        app = create_app()
    except Exception as app_err:
        print(f"创建应用实例失败: {str(app_err)}")
        return "无法生成标题：应用上下文创建失败"

    # 使用创建的应用上下文执行所有操作
    with app.app_context():
        # 加载历史记录
        try:
            history = load_history(conversation_id)
            print(f"成功加载对话历史记录，条数: {len(history)}")
        except Exception as e:
            print(f"加载对话历史记录出错: {str(e)}")
            return "无法加载对话历史：" + str(e)

    if not history:
        return "不存在的对话历史"

    # 处理历史内容
    for i in history:
        if i['role'] == 'user':
            i['content'] = parse_base64_blocks(i['content'])
        if i['role'] == 'assistant':
            i['content'] = parse_think_blocks(
                parse_search_blocks(
                parse_model_blocks(i['content']))[1])[1]

    # 添加请求获取标题
    title_prompt = "请根据以上对话内容生成一个标题，不要生成其他内容，标题需要简洁明了，不要超过10个字，不要使用markdown格式，不要书名号，不要emoji和konomoji，不要使用特殊字符，不要括号"
    history.append({"role": "user", "content": title_prompt})

    # 指定使用DeepSeek-V3模型生成标题
    front_model = "DeepSeek-V3"

    # 创建队列接收响应
    temp_queue = queue.Queue()

    # 获取响应
    updated_history = autohistory(
        history, front_model, temp_queue)

    # 从队列获取最后一个响应
    content = ""
    while True:
        try:
            response = temp_queue.get(timeout=1)
            if response is None:
                break
            content = response
        except queue.Empty:
            break

    return content
