from duckduckgo_search import DDGS

def search(query: str, max_results: int = 10) -> list:
    """
    使用代理进行DuckDuckGo搜索
    
    参数:
        query: 搜索关键词
        max_results: 最大返回结果数量，默认为10
        
    返回:
        搜索结果列表，每个结果包含title, href, body字段
    """
    # 设置代理
    proxy = 'http://127.0.0.1:7890'
    
    
    # 使用代理进行搜索
    try:
        with DDGS(proxy=proxy) as ddgs:
            results = [r for r in ddgs.text(query, max_results=max_results)]
            return results
    except Exception as e:
        print(f"搜索过程中发生错误: {e}")
        return []