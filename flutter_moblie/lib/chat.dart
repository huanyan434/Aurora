import 'package:flutter/material.dart';
import 'dart:convert'; // 用于JSON解析
import 'api.dart'; // 导入API文件以获取对话历史

class ChatPageDetail extends StatefulWidget {
  final int conversationId;
  final String title;

  const ChatPageDetail({
    super.key,
    required this.conversationId,
    required this.title,
  });

  @override
  State<ChatPageDetail> createState() => ChatPageDetailState();
}

class ChatPageDetailState extends State<ChatPageDetail> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  Map<String, String> _modelsMap = {}; // 存储模型ID到名称的映射
  bool _isLoading = true; // 控制加载动画的显示
  bool _shouldShowLoader = true; // 控制加载动画是否应该显示

  @override
  void initState() {
    super.initState();

    // 添加滚动监听器
    _scrollController.addListener(_onScroll);

    // 加载模型列表
    _loadModelsList();
    // 加载该对话的历史消息
    _loadConversationHistory();
  }

  // 滚动监听器
  void _onScroll() {
    // 检查是否滚动到了最底部
    bool isAtBottom = _scrollController.position.atEdge &&
                     _scrollController.position.pixels > 0;

    if (isAtBottom) {
      // 当滚动到最底部时，隐藏加载动画
      if (_shouldShowLoader) {
        setState(() {
          _shouldShowLoader = false;
        });
      }
    } else {
      // 当不在底部时，显示加载动画
      if (!_shouldShowLoader) {
        setState(() {
          _shouldShowLoader = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _loadConversationHistory() async {
    try {
      // 开始加载时显示加载动画
      setState(() {
        _isLoading = true;
      });

      // 调用API获取对话历史
      final response = await ChatApi.getMessagesList(widget.conversationId);

      if (response.success && response.data != null) {
        // 解析API返回的消息数据
        final messagesData = response.data!['messages'];

        // 根据API文档，messages可能是一个JSON字符串或已解析的数组
        List<dynamic> parsedMessages = [];

        if (messagesData != null) {
          if (messagesData is String) {
            // 如果是字符串，需要解析
            parsedMessages = jsonDecode(messagesData);
          } else if (messagesData is List) {
            // 如果已经是数组，直接使用
            parsedMessages = messagesData;
          }
        }

        setState(() {
          for (final msg in parsedMessages) {
            _messages.add({
              'id': msg['id'] ?? 0,
              'role': msg['role'] ?? 'assistant',
              'content': msg['content'] ?? '',
              'timestamp': msg['created_at'] != null
                  ? DateTime.parse(msg['created_at'])
                  : DateTime.now(),
            });
          }
          // 加载完成后隐藏加载动画
          _isLoading = false;
        });

        // 滚动到底部显示最新消息
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      } else {
        debugPrint('获取对话历史失败: ${response.message}');

        // 显示错误信息
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('获取对话历史失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }

        // 加载失败也要隐藏加载动画
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('加载对话历史时发生错误: $e');

      // 显示错误信息
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载对话历史时发生错误: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }

      // 加载出错也要隐藏加载动画
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    String message = _messageController.text.trim();
    _messageController.clear();

    setState(() {
      _messages.add({
        'id': _messages.isNotEmpty ? (_messages.last['id'] as int) + 1 : 1,
        'role': 'user',
        'content': message,
        'timestamp': DateTime.now(),
      });
    });

    // 滚动到底部
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });

    // 请求AI回复
    _sendToAIAndReceiveResponse(message);
  }

  // 加载模型列表
  void _loadModelsList() async {
    try {
      final response = await UserApi.getModelsList();
      if (response.success && response.data != null) {
        final List<dynamic> models = response.data!;
        setState(() {
          _modelsMap = {};
          for (final model in models) {
            if (model is Map<String, dynamic>) {
              final String id = model['ID'] as String? ?? '';
              final String name = model['Name'] as String? ?? '';
              if (id.isNotEmpty && name.isNotEmpty) {
                _modelsMap[id] = name;
              }
            }
          }
        });
        // 模型列表加载完成后，刷新消息以显示模型名称
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            setState(() {}); // 重新构建UI以显示模型名称
          }
        });
      } else {
        debugPrint('获取模型列表失败: ${response.message}');
      }
    } catch (e) {
      debugPrint('加载模型列表时发生错误: $e');
    }
  }

  // 提取模型ID
  String _extractModelId(String content) {
    if (content.isEmpty) return '';

    // 查找模型标识符，如 <model=model-name>
    RegExp modelIdRegex = RegExp(r'<model=([^>]+)>');
    Match? match = modelIdRegex.firstMatch(content);
    if (match != null) {
      return match.group(1) ?? '';
    }
    return '';
  }

  // 获取模型名称小部件
  Widget _getModelNameWidget(String content) {
    final modelId = _extractModelId(content);
    if (modelId.isNotEmpty && _modelsMap.containsKey(modelId)) {
      final modelName = _modelsMap[modelId]!;
      return Container(
        padding: EdgeInsets.only(left: 16, top: 5, bottom: 10), // 调整间距，让模型名称更靠近上方
        child: Text(
          modelName,
          style: TextStyle(
            fontSize: 14, // 增加2px字体大小
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      );
    }
    return Container(); // 如果没有模型ID或找不到对应名称，则返回空容器
  }

  // 处理消息内容，移除模型标签、推理内容等
  String _processMessageContent(String content) {
    if (content.isEmpty) return '';

    // 移除模型标识符，如 <model=deepseek-v3.2-exp>
    String processedContent = content.replaceAll(RegExp(r'<model=[^>]+>'), '').trim();
    // 移除推理内容标签 <think time=...>
    processedContent = processedContent.replaceAll(RegExp(r'<think time=\d+>[\s\S]*?<\/think>'), '').trim();

    return processedContent;
  }

  void _sendToAIAndReceiveResponse(String userMessage) async {
    try {
      // 添加临时的AI响应占位符，显示正在思考
      int tempMessageId = _messages.isNotEmpty ? (_messages.last['id'] as int) + 1 : 1;
      setState(() {
        _messages.add({
          'id': tempMessageId,
          'role': 'assistant',
          'content': '正在思考...',
          'timestamp': DateTime.now(),
          'isThinking': true, // 标记为正在思考的状态
        });
      });

      // 滚动到底部
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });

      // 调用线程列表API获取messageUserID和messageAssistantID
      final threadResponse = await ChatApi.getThreadList();
      int messageUserID = 1; // 默认值
      int messageAssistantID = 2; // 默认值

      if (threadResponse.success && threadResponse.data != null) {
        final threadList = threadResponse.data!['thread_list'];
        if (threadList != null) {
          final conversationKey = widget.conversationId.toString();
          if (threadList[conversationKey] != null) {
            messageUserID = threadList[conversationKey]['messageUserID'] ?? 1;
            messageAssistantID = threadList[conversationKey]['messageAssistantID'] ?? 2;
          }
        }
      }

      // 调用AI生成接口
      final response = await ChatApi.generate(
        conversationID: widget.conversationId,
        prompt: userMessage,
        messageUserID: messageUserID,
        messageAssistantID: messageAssistantID,
        model: 'gpt-3.5-turbo', // 默认模型，实际应用中应允许用户选择
      );

      if (response.success && response.data != null) {
        // 更新临时消息为实际响应
        setState(() {
          _messages.removeLast(); // 移除临时消息
          _messages.add({
            'id': tempMessageId,
            'role': 'assistant',
            'content': response.data!['content'] ?? '未能获取AI回复',
            'timestamp': DateTime.now(),
            'isThinking': false,
          });
        });
      } else {
        // 更新临时消息为错误信息
        setState(() {
          _messages.removeLast(); // 移除临时消息
          _messages.add({
            'id': tempMessageId,
            'role': 'assistant',
            'content': '抱歉，AI回复生成失败，请稍后再试。',
            'timestamp': DateTime.now(),
            'isThinking': false,
          });
        });
      }

      // 滚动到底部
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    } catch (e) {
      debugPrint('与AI通信时发生错误: $e');

      // 更新临时消息为错误信息
      setState(() {
        _messages.removeLast(); // 移除临时消息
        _messages.add({
          'id': _messages.isNotEmpty ? _messages.last['id'] : 1,
          'role': 'assistant',
          'content': '网络错误，请检查连接后重试。',
          'timestamp': DateTime.now(),
          'isThinking': false,
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // 顶部栏，包含返回按钮和标题
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      // 返回按钮
                      IconButton(
                        icon: Icon(
                          Icons.arrow_back_ios_new,
                          size: 20,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                        },
                      ),
                      // 标题
                      Expanded(
                        child: Text(
                          widget.title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // 更多选项按钮（可选）
                      IconButton(
                        icon: Icon(
                          Icons.more_vert,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        onPressed: () {
                          // 添加更多选项功能
                        },
                      ),
                    ],
                  ),
                ),

                // 分隔线
                Container(
                  height: 1,
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                ),

                // 消息列表
                Expanded(
                  child: _messages.isEmpty && !_isLoading
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.chat,
                                size: 64,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                              SizedBox(height: 16),
                              Text(
                                '还没有消息',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                              SizedBox(height: 8),
                              Text(
                                '发送第一条消息开始对话',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        )
                      : Stack(
                          children: [
                            ListView.builder(
                              controller: _scrollController,
                              itemCount: _messages.length + (_isLoading ? 1 : 0), // 如果正在加载，添加一个额外的item
                              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              itemBuilder: (context, index) {
                                // 如果正在加载且到达最后一条（虚拟的加载条目）
                                if (_isLoading && index == _messages.length) {
                                  return Container(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          CircularProgressIndicator(
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              Theme.of(context).colorScheme.primary,
                                            ),
                                          ),
                                          SizedBox(height: 16),
                                          Text(
                                            '加载中...',
                                            style: TextStyle(
                                              fontSize: 16,
                                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }

                                final message = _messages[index];
                                bool isUser = message['role'] == 'user';

                                return Container(
                                  margin: EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment:
                                        isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                                    children: [
                                      // 用户头像或AI头像
                                      if (!isUser)
                                        Container(
                                          width: 32,
                                          height: 32,
                                          margin: EdgeInsets.only(right: 8),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).colorScheme.primary,
                                            borderRadius: BorderRadius.circular(16),
                                          ),
                                          child: Icon(
                                            Icons.smart_toy,
                                            size: 18,
                                            color: Theme.of(context).colorScheme.onPrimary,
                                          ),
                                        ),

                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // 模型名称（仅AI消息显示）
                                          if (!isUser)
                                            _getModelNameWidget(message['content']),
                                          // 消息气泡
                                          Container(
                                            padding: EdgeInsets.symmetric(
                                                horizontal: 16, vertical: 12),
                                            decoration: BoxDecoration(
                                              color: isUser
                                                  ? Theme.of(context).colorScheme.primary
                                                  : Theme.of(context).colorScheme.surfaceContainerHighest,
                                              borderRadius: BorderRadius.only(
                                                topLeft: Radius.circular(18),
                                                topRight: Radius.circular(18),
                                                bottomLeft: isUser
                                                    ? Radius.circular(18)
                                                    : Radius.circular(4),
                                                bottomRight: isUser
                                                    ? Radius.circular(4)
                                                    : Radius.circular(18),
                                              ),
                                            ),
                                            constraints: BoxConstraints(
                                              maxWidth: MediaQuery.of(context).size.width * 0.8,
                                            ),
                                            child: SelectableText(
                                              _processMessageContent(message['content']),
                                              style: TextStyle(
                                                color: isUser
                                                    ? Theme.of(context).colorScheme.onPrimary
                                                    : Theme.of(context).colorScheme.onSurface,
                                                fontSize: 15,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),

                                      // 用户头像
                                      if (isUser)
                                        Container(
                                          width: 32,
                                          height: 32,
                                          margin: EdgeInsets.only(left: 8),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).colorScheme.secondary,
                                            borderRadius: BorderRadius.circular(16),
                                          ),
                                          child: Icon(
                                            Icons.person,
                                            size: 18,
                                            color: Theme.of(context).colorScheme.onSecondary,
                                          ),
                                        ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            // 加载动画（居中显示，仅在滚动到最底部时隐藏）
                            if (_isLoading && _messages.isNotEmpty && _shouldShowLoader)
                              Positioned.fill(
                                child: Container(
                                  color: Colors.transparent, // 保持背景透明
                                  child: Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        CircularProgressIndicator(
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            Theme.of(context).colorScheme.primary,
                                          ),
                                        ),
                                        SizedBox(height: 16),
                                        Text(
                                          '加载中...',
                                          style: TextStyle(
                                            fontSize: 16,
                                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                ),

                // 输入区域
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  color: Theme.of(context).colorScheme.surface,
                  child: Row(
                    children: [
                      // 附加功能按钮（如图片、文件等）
                      IconButton(
                        icon: Icon(
                          Icons.attach_file,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        onPressed: () {
                          // 添加附件功能
                        },
                      ),

                      // 输入框
                      Expanded(
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: TextField(
                            controller: _messageController,
                            decoration: InputDecoration(
                              hintText: '输入消息...',
                              border: InputBorder.none,
                              hintStyle: TextStyle(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                      ),

                      // 发送按钮
                      IconButton(
                        icon: Icon(
                          Icons.send,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        onPressed: _sendMessage,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}