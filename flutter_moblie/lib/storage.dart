import 'package:shared_preferences/shared_preferences.dart';

/// 用户信息数据模型
class UserInfo {
  final String? id;
  final String? username;
  final String? email;
  final String? avatar;
  final int? points;
  final bool? isVip;
  final String? token;

  UserInfo({
    this.id,
    this.username,
    this.email,
    this.avatar,
    this.points,
    this.isVip,
    this.token,
  });

  /// 从Map创建UserInfo实例
  factory UserInfo.fromMap(Map<String, dynamic> map) {
    return UserInfo(
      id: map['id'],
      username: map['username'],
      email: map['email'],
      avatar: map['avatar'],
      points: map['points']?.toInt(),
      isVip: map['isVip'] == 1 || map['isVip'] == true,
      token: map['token'],
    );
  }

  /// 转换为Map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'avatar': avatar,
      'points': points,
      'isVip': isVip == true ? 1 : 0,
      'token': token,
    };
  }

  /// 创建空的UserInfo实例
  static UserInfo empty() {
    return UserInfo(
      id: null,
      username: null,
      email: null,
      avatar: null,
      points: null,
      isVip: null,
      token: null,
    );
  }
}

/// 本地数据存储管理类
class LocalStorage {
  static SharedPreferences? _prefs;
  static const String _userInfoKey = 'user_info';

  /// 初始化本地存储
  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// 检查是否已初始化
  static bool get isInitialized => _prefs != null;

  /// 保存用户信息
  static Future<bool> saveUserInfo(UserInfo userInfo) async {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    final Map<String, dynamic> userMap = userInfo.toMap();
    final jsonString = _encodeMapToJson(userMap);

    return await _prefs!.setString(_userInfoKey, jsonString);
  }

  /// 获取用户信息
  static UserInfo getUserInfo() {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    final jsonString = _prefs!.getString(_userInfoKey);
    if (jsonString == null || jsonString.isEmpty) {
      return UserInfo.empty();
    }

    final Map<String, dynamic> userMap = _decodeJsonToMap(jsonString);
    return UserInfo.fromMap(userMap);
  }

  /// 清除用户信息
  static Future<bool> clearUserInfo() async {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    return await _prefs!.remove(_userInfoKey);
  }

  /// 检查是否存在用户信息
  static bool hasUserInfo() {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    return _prefs!.containsKey(_userInfoKey);
  }

  /// 保存其他键值对数据
  static Future<bool> saveData(String key, dynamic value) async {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    if (value is String) {
      return await _prefs!.setString(key, value);
    } else if (value is int) {
      return await _prefs!.setInt(key, value);
    } else if (value is double) {
      return await _prefs!.setDouble(key, value);
    } else if (value is bool) {
      return await _prefs!.setBool(key, value);
    } else if (value is List<String>) {
      return await _prefs!.setStringList(key, value);
    } else {
      // 对于其他类型，转换为JSON字符串存储
      final jsonString = value.toString(); // 简单处理，实际项目中可能需要更复杂的序列化
      return await _prefs!.setString(key, jsonString);
    }
  }

  /// 获取数据
  static dynamic getData(String key, {dynamic defaultValue}) {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    if (defaultValue is String) {
      return _prefs!.getString(key) ?? defaultValue;
    } else if (defaultValue is int) {
      return _prefs!.getInt(key) ?? defaultValue;
    } else if (defaultValue is double) {
      return _prefs!.getDouble(key) ?? defaultValue;
    } else if (defaultValue is bool) {
      return _prefs!.getBool(key) ?? defaultValue;
    } else if (defaultValue is List<String>) {
      return _prefs!.getStringList(key) ?? defaultValue;
    } else {
      // 对于其他类型，获取JSON字符串并尝试转换
      final value = _prefs!.getString(key);
      return value ?? defaultValue;
    }
  }

  /// 清除指定键的数据
  static Future<bool> clearData(String key) async {
    if (!isInitialized) {
      throw Exception('LocalStorage未初始化，请先调用initialize()方法');
    }

    return await _prefs!.remove(key);
  }

  /// 将Map编码为JSON字符串
  static String _encodeMapToJson(Map<String, dynamic> map) {
    final items = <String>[];
    map.forEach((key, value) {
      String valueStr;
      if (value is String) {
        valueStr = '"$value"';
      } else if (value is num || value is bool) {
        valueStr = value.toString();
      } else {
        valueStr = '"$value"';
      }
      items.add('"$key":$valueStr');
    });
    return '{${items.join(',')}}';
  }

  /// 将JSON字符串解码为Map
  static Map<String, dynamic> _decodeJsonToMap(String jsonString) {
    // 简单的JSON解析实现，实际项目中建议使用dart:convert包
    final result = <String, dynamic>{};
    
    // 移除首尾的大括号
    String content = jsonString.trim();
    if (content.startsWith('{') && content.endsWith('}')) {
      content = content.substring(1, content.length - 1);
    }
    
    // 分割键值对
    final pairs = content.split(',');
    for (String pair in pairs) {
      pair = pair.trim();
      final colonIndex = pair.indexOf(':');
      if (colonIndex > 0) {
        final key = pair.substring(0, colonIndex).trim();
        String value = pair.substring(colonIndex + 1).trim();
        
        // 移除键的引号
        String cleanKey = key;
        if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
          cleanKey = cleanKey.substring(1, cleanKey.length - 1);
        }
        
        // 移除值的引号并转换类型
        if (value.startsWith('"') && value.endsWith('"')) {
          result[cleanKey] = value.substring(1, value.length - 1);
        } else if (value == 'true') {
          result[cleanKey] = true;
        } else if (value == 'false') {
          result[cleanKey] = false;
        } else if (value.contains('.')) {
          // 尝试解析为double
          double? doubleValue = double.tryParse(value);
          result[cleanKey] = doubleValue ?? value;
        } else {
          // 尝试解析为int
          int? intValue = int.tryParse(value);
          result[cleanKey] = intValue ?? value;
        }
      }
    }
    
    return result;
  }
}