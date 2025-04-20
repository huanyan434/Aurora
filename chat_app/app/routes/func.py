from openai import OpenAI
from dotenv import load_dotenv, find_dotenv
import os
import re
import json
import time
import copy
from app.history import save_history, load_history

from app import create_app
app = create_app()


def model_name(model:str):
    # 正向
    if model == "deepseek-ai/DeepSeek-R1":
        model = "DeepSeek-R1"
    elif model == "deepseek-ai/DeepSeek-V3":
        model = "DeepSeek-V3"
    elif model == "doubao-1-5-lite-250115":
        model = "Doubao-1.5-lite"
    elif model == "doubao-1-5-pro-250115":
        model = "Doubao-1.5-pro"
    elif model == "doubao-1-5-pro-256k-250115":
        model = "Doubao-1.5-pro-256k"
    elif model == "doubao-1-5-vision-pro-32k-250115":
        model = "Doubao-1.5-vision-pro"
    # 反向
    elif model == "DeepSeek-R1":
        model = "deepseek-ai/DeepSeek-R1"
    elif model == "DeepSeek-V3":
        model = "deepseek-ai/DeepSeek-V3"
    elif model == "Doubao-1.5-lite":
        model = "doubao-1-5-lite-250115"
    elif model == "Doubao-1.5-pro":
        model = "doubao-1-5-pro-250115"
    elif model == "Doubao-1.5-pro-256k":
        model = "doubao-1-5-pro-256k-250115"
    elif model == "Doubao-1.5-vision-pro":
        model = "doubao-1-5-vision-pro-32k-250115"
    return model
def stream_volcano_ark_api(model:str, history:list):
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyA']
    client = OpenAI(
        api_key=api_key, 
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        timeout=1800,
    )
    response = client.chat.completions.create(
        model=model,
        messages=history,
        stream=True,
    )
    reasoning_content = ""
    content = ""
    fstrs = True
    fstct = True
    stm = time.time()

    for chunk in response:
        if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
            if fstrs == True:
                fstrs = False
            reasoning_content += chunk.choices[0].delta.reasoning_content
            tkt = time.time() - stm
            yield "<think time=" + str(int(tkt)) + ">" + reasoning_content + "</think>"
        else:
            if fstct == True:
                fstct = False
                tkt = time.time() - stm
            content += chunk.choices[0].delta.content
            if reasoning_content == None or reasoning_content.strip() == "":
                yield content
            else:
                yield "<think time=" + str(int(tkt)) + ">" + reasoning_content + "</think>" + content

def stream_siliconflow_api(model:str, history:list):
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyB']
    client = OpenAI(
        api_key=api_key, 
        base_url="https://api.siliconflow.cn/v1",
        timeout=1800,
    )
    response = client.chat.completions.create(
        model=model,
        messages=history,
        stream=True,
    )
    reasoning_content = ""
    content = ""
    fstrs = True
    fstct = True
    stm = time.time()

    for chunk in response:
        if chunk.choices[0].delta.reasoning_content:
            if fstrs == True:
                fstrs = False
            reasoning_content += chunk.choices[0].delta.reasoning_content
            tkt = time.time() - stm
            yield "<think time=" + str(int(tkt)) + ">" + reasoning_content + "</think>"
        if chunk.choices[0].delta.content:
            if fstct == True:
                fstct = False
                tkt = time.time() - stm
            content += chunk.choices[0].delta.content
            if reasoning_content == None or reasoning_content.strip() == "":
                yield content
            else:
                yield "<think time=" + str(int(tkt)) + ">" + reasoning_content + "</think>" + content

def autohistory(history:dict, prompt:str, model:str):
    history.append(
            {
                "role": "user",
                "content": prompt
            }
        )
    his = copy.deepcopy(history)
    for i in his:
        if i['role'] == 'user':
            i['content'] = parse_base64_blocks(i['content'])
        if i['role'] == 'assistant':
            i['content'] = parse_think_blocks(parse_model_blocks(i['content']))[1]
    if "doubao" in model:
        req = stream_volcano_ark_api(model, his)
    else:
        req = stream_siliconflow_api(model, his)
    for word in req:
        yield word
    model = model_name(model)
    history.append(
        {
            "role": "assistant",
            "content": "<model=\"" + model + "\"/>" + word
        }
    )

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
    
    # 构造新的思考内容格式
    think_block = f"<think time={think_time}>{think_content}"
    
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

def generate(message_id, prompt, conversation_id, model, image_base64=None):
    model = model_name(model)

    # 确保prompt不为None
    if prompt is None:
        prompt = ""
    
    with app.app_context():
        history = load_history(conversation_id)
    # 调用Qwen解析图片
    if image_base64:
        describe = qwen_parse_image(image_base64)
        #print(describe)
        prompt = prompt + f"\n\n<image>用户上传了一张图片，你可以查看图片描述：{describe}</image>\n\n<base64>{image_base64}</base64>"
    for i in autohistory(history, prompt, model):
        parsed = parse_think_blocks(i)
        if parsed:
            think_block, remaining_text = parsed
            yield json.dumps({
                "message_id": message_id,
                "text": remaining_text,
                "think": think_block
            }) + "\n"
            with app.app_context():
                save_history(conversation_id, history)
    
    with app.app_context():
        save_history(conversation_id, history)

def qwen_parse_image(image_base64):
    _ = load_dotenv(find_dotenv())
    api_key = os.environ['api_keyB']
    client = OpenAI(
        api_key=api_key, 
        base_url="https://api.siliconflow.cn/v1",
        timeout=1800,
    )
    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-VL-32B-Instruct",
        messages=[
            {
                "role": "user",
                "content":[
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "data:image/jpeg;base64," + image_base64,
                            "detail":"high"
                        }
                    },
                    {
                        "type": "text",
                        "text": "用自然语言描述图片，禁用markdown格式"
                    }
                ]
            }
        ]
    )
    return response.choices[0].message.content
