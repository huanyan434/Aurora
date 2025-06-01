from duckduckgo_search import DDGS

def search(query: str, max_results: int = 50) -> list:
    """
    使用代理进行DuckDuckGo搜索
    
    参数:
        query: 搜索关键词
        max_results: 最大返回结果数量，默认为50
        
    返回:
        搜索结果列表，每个结果包含title, href, body字段
    """
    # 设置代理
    proxy = 'http://127.0.0.1:7890'
    
    if max_results < 20:
        max_results = 20
    i = 0
    while True:
        # 使用代理进行搜索
        try:
            with DDGS(proxy=proxy) as ddgs:
                results = [r for r in ddgs.text(query, max_results=max_results)]
                print(results)
                return eval(str(results))
        except Exception as e:
            if not e == 'https://html.duckduckgo.com/html 202 Ratelimit':
                print(f"搜索过程中发生错误: {e}")
                return []
            elif e == 'https://html.duckduckgo.com/html 202 Ratelimit':
                if i > 1:
                    break
                else:
                    i += 1
                    print('第一次尝试失败（RateLimit），正在尝试第二次')
                    continue