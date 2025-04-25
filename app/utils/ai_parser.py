import re

def parse_ai_response(response_stream):
    """
    解析AI响应中的<think>标签和普通内容
    返回生成器，产生(类型, 内容)元组
    """
    buffer = ""
    in_think = False
    
    for chunk in response_stream:
        buffer += chunk
        
        while True:
            if not in_think:
                think_start = buffer.find('<think>')
                if think_start == -1:
                    yield ('text', buffer)
                    buffer = ""
                    break
                
                yield ('text', buffer[:think_start])
                buffer = buffer[think_start+7:]
                in_think = True
            else:
                think_end = buffer.find('</think>')
                if think_end == -1:
                    break
                
                yield ('think', buffer[:think_end])
                buffer = buffer[think_end+8:]
                in_think = False