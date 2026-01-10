import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart' as http_io;
import 'package:flutter/foundation.dart'; // 用于日志输出
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io' as io;

/// API客户端类，用于处理与后端服务器的通信
class ApiClient {
  static const String apiUrl = 'https://c.wanyim.cn/api';
  static const String chatUrl = 'https://c.wanyim.cn/chat';

  // 获取HTTP客户端
  static http.Client? _client;
  static http_io.IOClient? _ioClient;
  static io.HttpClient? _httpClient;

  // 初始化客户端
  static Future<void> initialize() async {
    // 创建支持Cookie持久化的HttpClient
    _httpClient = io.HttpClient()
      ..connectionTimeout = Duration(seconds: 30)
      ..idleTimeout = Duration(seconds: 30)
      ..badCertificateCallback = (cert, host, port) => false;

    // 创建IOClient
    _ioClient = http_io.IOClient(_httpClient!);
    _client = _ioClient;

    // 尝试从本地存储加载Cookie
    SharedPreferences prefs = await SharedPreferences.getInstance();
    String? storedCookies = prefs.getString('session_cookies');

    if (storedCookies != null && storedCookies.isNotEmpty) {
      // 解析并设置cookie
      _setCookiesFromString(storedCookies);
    }
  }

  // 从字符串设置cookies
  static void _setCookiesFromString(String cookieString) {
    // 解析cookie字符串并设置到HttpClient
    List<String> cookies = cookieString.split(';');
    for (String cookie in cookies) {
      if (cookie.trim().isNotEmpty) {
        // 这里可以进一步解析cookie，但简单起见，我们只记录
        debugPrint('加载Cookie: $cookie');
      }
    }
  }

  // 保存Cookie到本地存储
  static Future<void> _saveCookies(http.Response response) async {
    String? setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader != null && setCookieHeader.isNotEmpty) {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_cookies', setCookieHeader);
    }
  }

  // 获取存储的Cookie
  static Future<String?> _getStoredCookies() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString('session_cookies');
  }

  // GET请求
  static Future<http.Response> get(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$apiUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API GET请求: $url');
      final response = await _client!.get(url, headers: requestHeaders);
      debugPrint('API GET响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API GET请求失败: $e');
      throw Exception('GET请求失败: $e');
    }
  }

  // POST请求
  static Future<http.Response> post(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$apiUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API POST请求: $url, Body: ${jsonEncode(body)}');
      final response = await _client!.post(
        url,
        headers: requestHeaders,
        body: jsonEncode(body),
      );
      debugPrint('API POST响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API POST请求失败: $e');
      throw Exception('POST请求失败: $e');
    }
  }

  // PUT请求
  static Future<http.Response> put(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$apiUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API PUT请求: $url, Body: ${jsonEncode(body)}');
      final response = await _client!.put(
        url,
        headers: requestHeaders,
        body: jsonEncode(body),
      );
      debugPrint('API PUT响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API PUT请求失败: $e');
      throw Exception('PUT请求失败: $e');
    }
  }

  // DELETE请求
  static Future<http.Response> delete(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$apiUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API DELETE请求: $url');
      final response = await _client!.delete(url, headers: requestHeaders);
      debugPrint('API DELETE响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API DELETE请求失败: $e');
      throw Exception('DELETE请求失败: $e');
    }
  }

  // Chat相关请求 - GET
  static Future<http.Response> chatGet(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$chatUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API Chat GET请求: $url');
      final response = await _client!.get(url, headers: requestHeaders);
      debugPrint('API Chat GET响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API Chat GET请求失败: $e');
      throw Exception('Chat GET请求失败: $e');
    }
  }

  // Chat相关请求 - POST
  static Future<http.Response> chatPost(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
  }) async {
    if (_client == null) {
      await initialize();
    }

    final url = Uri.parse('$chatUrl$endpoint');
    final Map<String, String> requestHeaders = {
      'Content-Type': 'application/json',
      ...?headers,
    };

    // 添加存储的cookies到请求头
    String? storedCookies = await _getStoredCookies();
    if (storedCookies != null && storedCookies.isNotEmpty) {
      requestHeaders['cookie'] = storedCookies;
    }

    try {
      debugPrint('API Chat POST请求: $url, Body: ${jsonEncode(body)}');
      final response = await _client!.post(
        url,
        headers: requestHeaders,
        body: jsonEncode(body),
      );
      debugPrint('API Chat POST响应: ${response.statusCode}, ${response.body}');
      await _saveCookies(response); // 保存cookies
      return response;
    } catch (e) {
      debugPrint('API Chat POST请求失败: $e');
      throw Exception('Chat POST请求失败: $e');
    }
  }

  // 通用错误处理
  static String getErrorMessage(http.Response response) {
    try {
      final Map<String, dynamic> errorData = jsonDecode(response.body);
      debugPrint('API错误响应: $errorData');

      // 检查是否是未登录状态
      if (response.statusCode == 400 &&
          (errorData['message']?.toString().toLowerCase().contains('login') == true ||
           errorData['message']?.toString().toLowerCase().contains('未登录') == true)) {
        return '未登录';
      }

      return errorData['message'] ?? '未知错误';
    } catch (e) {
      debugPrint('无法解析错误信息: ${response.body}');
      return '无法解析错误信息: ${response.body}';
    }
  }

  // 关闭客户端
  static void close() {
    _client?.close();
  }
}

// API响应数据模型示例
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final int? statusCode;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.statusCode,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json, {
    T Function(dynamic)? dataParser,
  }) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      data: json['data'] != null && dataParser != null
          ? dataParser(json['data'])
          : null,
      message: json['message'],
      statusCode: json['statusCode'],
    );
  }
}

// 用户相关API
class UserApi {
  // 获取当前用户信息
  static Future<ApiResponse<Map<String, dynamic>>> getCurrentUser() async {
    try {
      final response = await ApiClient.get('/current_user');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        final errorMessage = ApiClient.getErrorMessage(response);
        // 如果是未登录状态，返回特定的成功状态但数据为空
        if (errorMessage == '未登录') {
          return ApiResponse<Map<String, dynamic>>(
            success: true, // 标记为成功，但表示用户未登录
            message: errorMessage,
            statusCode: response.statusCode,
          );
        } else {
          return ApiResponse<Map<String, dynamic>>(
            success: false,
            message: errorMessage,
            statusCode: response.statusCode,
          );
        }
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 获取签到状态
  static Future<ApiResponse<Map<String, dynamic>>> getSignStatus() async {
    try {
      final response = await ApiClient.get('/has_signed');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 用户登录
  static Future<ApiResponse<Map<String, dynamic>>> login(
    String email,
    String password,
  ) async {
    try {
      final response = await ApiClient.post(
        '/login',
        body: {'email': email, 'password': password},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 用户退出登录
  static Future<ApiResponse<Map<String, dynamic>>> logout() async {
    try {
      final response = await ApiClient.post('/logout');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 发送验证码
  static Future<ApiResponse<Map<String, dynamic>>> sendVerifyCode(
    String email,
  ) async {
    try {
      final response = await ApiClient.post(
        '/send_verify_code',
        body: {'email': email},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 用户注册
  static Future<ApiResponse<Map<String, dynamic>>> signup(
    String username,
    String email,
    String password,
    String verifyCode,
  ) async {
    try {
      final response = await ApiClient.post(
        '/signup',
        body: {
          'username': username,
          'email': email,
          'password': password,
          'verifyCode': verifyCode,
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 用户签到
  static Future<ApiResponse<Map<String, dynamic>>> sign() async {
    try {
      final response = await ApiClient.post('/sign');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 验证积分充值
  static Future<ApiResponse<Map<String, dynamic>>> verifyPoints(
    String orderID,
  ) async {
    try {
      final response = await ApiClient.post(
        '/verify_points',
        body: {'orderID': orderID},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 验证VIP会员
  static Future<ApiResponse<Map<String, dynamic>>> verifyVip(
    String orderID, {
    bool force = false,
  }) async {
    try {
      final response = await ApiClient.post(
        '/verify_vip',
        body: {'orderID': orderID, 'force': force},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 获取模型列表
  static Future<ApiResponse<List<dynamic>>> getModelsList() async {
    try {
      final response = await ApiClient.get('/models_list');

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);
        final List<dynamic>? models = responseData['models'] as List<dynamic>?;

        return ApiResponse<List<dynamic>>.fromJson({
          'success': true,
          'data': models ?? [],
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as List<dynamic>);
      } else {
        return ApiResponse<List<dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<List<dynamic>>(success: false, message: e.toString());
    }
  }
}

// 聊天相关API
class ChatApi {
  // 获取对话列表
  static Future<ApiResponse<List<dynamic>>> getConversationsList() async {
    try {
      final response = await ApiClient.chatGet('/conversations_list');

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);

        // 检查响应格式，如果是包含conversations字段的对象
        if (responseData.containsKey('conversations') && responseData['conversations'] is List) {
          return ApiResponse<List<dynamic>>.fromJson({
            'success': responseData['success'] ?? true,
            'data': responseData['conversations'],
            'statusCode': response.statusCode,
          }, dataParser: (json) => json as List<dynamic>);
        } else {
          // 如果直接是数组格式
          return ApiResponse<List<dynamic>>.fromJson({
            'success': true,
            'data': responseData,
            'statusCode': response.statusCode,
          }, dataParser: (json) => json as List<dynamic>);
        }
      } else {
        return ApiResponse<List<dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<List<dynamic>>(success: false, message: e.toString());
    }
  }

  // 删除对话
  static Future<ApiResponse<Map<String, dynamic>>> deleteConversation(
    int conversationID,
  ) async {
    try {
      final response = await ApiClient.chatPost(
        '/delete_conversation',
        body: {'conversationID': conversationID},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 删除消息
  static Future<ApiResponse<Map<String, dynamic>>> deleteMessage(
    int messageID,
  ) async {
    try {
      final response = await ApiClient.chatPost(
        '/delete_message',
        body: {'messageID': messageID},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 生成AI回复
  static Future<ApiResponse<Map<String, dynamic>>> generate({
    required int conversationID,
    required String prompt,
    required int messageUserID,
    required int messageAssistantID,
    String? base64,
    String model = 'gpt-3.5-turbo',
    bool reasoning = false,
  }) async {
    try {
      final response = await ApiClient.chatPost(
        '/generate',
        body: {
          'conversationID': conversationID,
          'prompt': prompt,
          'messageUserID': messageUserID,
          'messageAssistantID': messageAssistantID,
          if (base64 != null) 'base64': base64,
          'model': model,
          'reasoning': reasoning,
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 获取历史消息
  static Future<ApiResponse<Map<String, dynamic>>> getMessagesList(
    int conversationID,
  ) async {
    try {
      final response = await ApiClient.chatPost(
        '/messages_list',
        body: {'conversationID': conversationID},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 创建新对话
  static Future<ApiResponse<Map<String, dynamic>>> newConversation() async {
    try {
      final response = await ApiClient.chatPost('/new_conversation');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 分享消息
  static Future<ApiResponse<Map<String, dynamic>>> shareMessages(
    List<String> messageIDs,
  ) async {
    try {
      final response = await ApiClient.chatPost(
        '/share_messages',
        body: {'messageIDs': messageIDs},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 停止生成
  static Future<ApiResponse<Map<String, dynamic>>> stop(
    int conversationID,
  ) async {
    try {
      final response = await ApiClient.chatPost(
        '/stop',
        body: {'conversationID': conversationID},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 语音转文字
  static Future<ApiResponse<Map<String, dynamic>>> stt(String base64) async {
    try {
      final response = await ApiClient.chatPost(
        '/stt',
        body: {'base64': base64},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 文字转语音
  static Future<ApiResponse<Map<String, dynamic>>> tts(String prompt) async {
    try {
      final response = await ApiClient.chatPost(
        '/tts',
        body: {'prompt': prompt},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 获取线程列表
  static Future<ApiResponse<Map<String, dynamic>>> getThreadList() async {
    try {
      final response = await ApiClient.chatPost('/thread_list');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }

  // 获取分享内容
  static Future<ApiResponse<Map<String, dynamic>>> getShareContent(
    String shareID,
  ) async {
    try {
      final response = await ApiClient.get('/$shareID');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ApiResponse<Map<String, dynamic>>.fromJson({
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        }, dataParser: (json) => json as Map<String, dynamic>);
      } else {
        return ApiResponse<Map<String, dynamic>>(
          success: false,
          message: ApiClient.getErrorMessage(response),
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>(
        success: false,
        message: e.toString(),
      );
    }
  }
}
