import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:flutter_statusbarcolor_ns/flutter_statusbarcolor_ns.dart';
import 'api.dart';
import 'storage.dart';
import 'login.dart';
import 'signup.dart';
import 'chat.dart'; // 导入新的对话详情页面

// 预加载数据的缓存
Map<String, dynamic>? _preloadedUserData;
List<dynamic>? _preloadedConversationsList;

void main() async {
  // 确保Flutter框架初始化完成
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化本地存储
  await LocalStorage.initialize();

  // 初始化API客户端
  await ApiClient.initialize();

  runApp(const SplashScreen());
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {

  @override
  void initState() {
    super.initState();

    // 在打开Splash的一瞬间就发出GET请求，实现并行加载
    // 预加载用户信息和对话列表，并处理结果
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // 设置5秒超时
      final timeout = Completer<void>();
      Timer(const Duration(seconds: 5), () {
        if (!timeout.isCompleted) {
          timeout.complete();
        }
      });

      // 启动API请求
      final apiFuture = () async {
        try {
          // 同时发起多个API请求
          final userFuture = UserApi.getCurrentUser();
          final chatFuture = ChatApi.getConversationsList();

          // 等待请求完成并处理结果
          final userResponse = await userFuture;
          final chatResponse = await chatFuture;

          // 缓存API响应结果，供主界面使用
          if (userResponse.success && userResponse.data != null) {
            _preloadedUserData = userResponse.data;
          }

          if (chatResponse.success && chatResponse.data != null) {
            _preloadedConversationsList = chatResponse.data;
          }
        } catch (e) {
          debugPrint('预加载API请求失败: $e');
        }
      }();

      // 等待API请求完成或超时
      await Future.any([apiFuture, timeout.future]);

      // 跳转到主应用
      if (mounted) {
        Navigator.pushReplacement(
          _navigatorKey.currentContext!,
          MaterialPageRoute(builder: (context) => const MyApp()),
        );
      }
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ).copyWith(
          surface: const Color(0xFF1A1A1A), // 使用10%的灰色（黑色90%）
          surfaceContainerHighest: const Color(0xFF292929), // 调整容器颜色
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system, // 跟随系统设置
      navigatorKey: _navigatorKey,
      home: Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        body: LayoutBuilder(
          builder: (context, constraints) {
            return Stack(
              children: [
                // 背景
                Container(
                  color: Theme.of(context).colorScheme.surface,
                ),
                // 图标，放置在垂直48%的位置
                Positioned(
                  top: constraints.maxHeight * 0.48 - 60,
                  left: 0,
                  right: 0,
                  child: Image.asset(
                    'lib/icon_noBG.png', // 使用正确的图标文件
                    width: 120,
                    height: 120,
                    fit: BoxFit.contain,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aurora AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light, // 明亮主题
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark, // 深色主题
        ).copyWith(
          surface: const Color(0xFF1A1A1A), // 使用10%的灰色（黑色90%）
          surfaceContainerHighest: const Color(0xFF292929), // 调整容器颜色
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system, // 跟随系统设置
      initialRoute: '/',
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
      },
      home: const MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> with WidgetsBindingObserver {
  int _selectedIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _changeStatusBarColor();

    // 初始化页面，确保它们在创建时就开始加载
    _pages = [
      KeepAliveWrapper(child: ChatPage()),
      KeepAliveWrapper(child: ProfilePage()),
    ];

    // 如果有预加载的用户数据，立即更新UI
    if (_preloadedUserData != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        setState(() {
        });
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 处理应用生命周期变化
    if (state == AppLifecycleState.resumed) {
      // 应用恢复时可以刷新数据
    }
  }

  // 封装一个方法来改变系统栏颜色
  Future<void> _changeStatusBarColor() async {
    try {
      // 仅在Android和iOS平台上设置状态栏颜色
      if (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS) {
        // 1. 设置状态栏颜色为透明
        await FlutterStatusbarcolor.setStatusBarColor(Colors.transparent);
        // 2. 设置导航栏颜色为透明
        await FlutterStatusbarcolor.setNavigationBarColor(Colors.transparent);

        // 3. 设置状态栏图标颜色为深色 (因为背景是白色)
        // false 代表深色图标, true 代表浅色图标
        await FlutterStatusbarcolor.setStatusBarWhiteForeground(false);

        // 4. 设置导航栏图标颜色为深色
        await FlutterStatusbarcolor.setNavigationBarWhiteForeground(false);
      }
    } catch (e) {
      debugPrint('设置状态栏颜色失败: $e');
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    // 在状态更新后，触发对应页面的数据更新
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (index == 0) {
        // 切换到聊天页面时，触发数据更新
        DataUpdateController().onChatPageActivate?.call();
      } else if (index == 1) {
        // 切换到我的页面时，触发数据更新
        DataUpdateController().onProfilePageActivate?.call();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 使用主题背景色，适配深色模式
      backgroundColor: Theme.of(context).colorScheme.surface,
      // 关键：让内容延伸到导航栏下方，实现底部沉浸效果
      extendBody: true,
      body: Stack(
        children: [
          // 背景容器，会延伸到系统栏下方
          Container(decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface)),

          // 使用 SafeArea 包裹你的主要内容
          // 这样内容就会自动避开状态栏和导航栏的区域，不会被遮挡
          SafeArea(
            child: Column(
              children: [
                // 你的 AppBar
                AppBar(
                  backgroundColor: Theme.of(context).colorScheme.surface, // 使用主题背景色
                  elevation: 0, // 移除阴影
                  title: Text(
                    _selectedIndex == 0 ? '对话' : '', // 聊天页面显示"对话"，我的页面留空
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface, // 使用主题文字颜色
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  centerTitle: true, // 标题居中
                  foregroundColor: Theme.of(context).colorScheme.onSurface, // 使用主题图标颜色
                ),
                Expanded(
                  child: IndexedStack(
                    index: _selectedIndex,
                    children: _pages,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _selectedIndex == 0
        ? FloatingActionButton(
            onPressed: () {
              // 创建新对话
              debugPrint('创建新对话');
            },
            child: const Icon(Icons.add),
          )
        : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_outlined, size: 28),
            selectedIcon: Icon(Icons.chat, size: 28),
            label: '聊天',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline, size: 28),
            selectedIcon: Icon(Icons.person, size: 28),
            label: '我的',
          ),
        ],
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        indicatorColor: Colors.transparent, // 移除指示器颜色
        backgroundColor: Theme.of(context).colorScheme.surface, // 使用主题背景色
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow, // 始终显示标签
      ),
    );
  }
}

// 用于保持页面状态的包装器组件
class KeepAliveWrapper extends StatefulWidget {
  final Widget child;

  const KeepAliveWrapper({super.key, required this.child});

  @override
  State<KeepAliveWrapper> createState() => _KeepAliveWrapperState();
}

class _KeepAliveWrapperState extends State<KeepAliveWrapper>
    with AutomaticKeepAliveClientMixin {
  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }

  @override
  bool get wantKeepAlive => true;
}

// 数据更新控制器
class DataUpdateController {
  static final DataUpdateController _instance = DataUpdateController._internal();
  factory DataUpdateController() => _instance;
  DataUpdateController._internal();

  VoidCallback? onChatPageActivate;
  VoidCallback? onProfilePageActivate;
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  List<Map<String, dynamic>>? _conversationsList;
  List<Map<String, dynamic>>? _filteredConversationsList; // 添加过滤后的对话列表
  bool _hasLoaded = false; // 标记是否已加载过数据
  String _searchQuery = ''; // 添加搜索查询字符串

  @override
  void initState() {
    super.initState();
    // 注册到数据更新控制器，不显示加载指示器
    DataUpdateController().onChatPageActivate = () => _getConversationsList(showLoadingIndicator: false);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // 页面被激活时加载数据
    if (!_hasLoaded) {
      _getConversationsList(showLoadingIndicator: false);
      _hasLoaded = true;
    }
  }

  @override
  void didUpdateWidget(covariant ChatPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 页面重新构建时，如果当前页面是可见的，可以考虑更新数据
    // 但这里我们不自动更新，只在用户切换到页面时更新
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 搜索框
          Container(
            margin: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(20),
            ),
            child: TextField(
              decoration: InputDecoration(
                hintText: '搜索对话',
                prefixIcon: Icon(Icons.search),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(12),
                hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
              onChanged: _onSearchTextChanged, // 添加搜索文本变化监听器
            ),
          ),
          const SizedBox(height: 8),
          // 对话列表，包含下拉刷新
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refreshConversationsList,
              child: _getConversationListToShow() != null && _getConversationListToShow()!.isNotEmpty
                ? ListView.builder(
                  itemCount: _getConversationListToShow()!.length,
                  itemBuilder: (context, index) {
                    final conversation = _getConversationListToShow()![index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0), // 增加垂直边距
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0), // 减小内边距
                        minVerticalPadding: 0, // 最小垂直内边距
                        leading: CircleAvatar(
                          radius: 20, // 减小头像大小
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          child: Icon(
                            Icons.chat,
                            color: Theme.of(context).colorScheme.onPrimary,
                            size: 18,
                          ),
                        ),
                        title: Text(
                          conversation['Title'] ?? '新对话', // 使用正确的字段名
                          style: TextStyle(
                            fontSize: 15, // 稍微减小字体
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        subtitle: Text(
                          conversation['Summary'] ?? '', // 显示摘要或空字符串
                          style: TextStyle(
                            fontSize: 13, // 减小字体
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1, // 减少最大行数
                          overflow: TextOverflow.ellipsis, // 超出时显示省略号
                        ),
                        trailing: Text(
                          conversation['UpdatedAt'] != null
                            ? DateTime.parse(conversation['UpdatedAt']).toString().substring(0, 10) // 显示日期
                            : '',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 13,
                          ),
                        ),
                        onTap: () {
                          // 跳转到对话详情页面
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ChatPageDetail(
                                conversationId: conversation['ID'],
                                title: conversation['Title'] ?? '新对话',
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                )
                : const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.chat_outlined,
                        size: 64,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        '暂无对话',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        '点击右下角按钮开始新的对话',
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
            ),
          ),
        ],
      ),
    );
  }

  // 搜索文本变化处理函数
  void _onSearchTextChanged(String query) {
    setState(() {
      _searchQuery = query;
      _filterConversations();
    });
  }

  // 过滤对话列表
  void _filterConversations() {
    if (_searchQuery.isEmpty) {
      _filteredConversationsList = _conversationsList;
    } else {
      _filteredConversationsList = _conversationsList?.where((conversation) {
        final title = conversation['Title']?.toLowerCase() ?? '';
        final search = _searchQuery.toLowerCase();
        return title.contains(search);
      }).toList();
    }
  }

  // 获取要显示的对话列表（原始列表或过滤后的列表）
  List<Map<String, dynamic>>? _getConversationListToShow() {
    return _searchQuery.isEmpty ? _conversationsList : _filteredConversationsList;
  }

  // 获取对话列表的方法
  void _getConversationsList({bool showLoadingIndicator = true}) async {
    // 优先使用预加载的数据
    if (_preloadedConversationsList != null) {
      // 转换预加载的数据格式为需要的格式
      final List<Map<String, dynamic>> conversations = [];
      for (final item in _preloadedConversationsList!) {
        conversations.add({
          'ID': item['ID'] ?? '',
          'Title': item['Title'] ?? '新对话',
          'Summary': item['Summary'] ?? '', // 添加摘要字段
          'UpdatedAt': item['UpdatedAt'] ?? '',
        });
      }

      setState(() {
        _conversationsList = conversations;
        if (showLoadingIndicator) {
        }
        _filterConversations(); // 添加这一行以确保在加载数据后应用过滤
      });
      debugPrint('使用预加载对话列表: 共${conversations.length}个对话');

      // 重置预加载数据，避免重复使用
      _preloadedConversationsList = null;
      return;
    }

    if (showLoadingIndicator) {
      setState(() {
      });
    }

    try {
      final response = await ChatApi.getConversationsList();

      if (response.success && response.data != null) {
        // 转换API返回的数据格式为需要的格式
        final List<Map<String, dynamic>> conversations = [];
        for (final item in response.data!) {
          conversations.add({
            'ID': item['ID'] ?? '',
            'Title': item['Title'] ?? '新对话',
            'Summary': item['Summary'] ?? '', // 添加摘要字段
            'UpdatedAt': item['UpdatedAt'] ?? '',
          });
        }

        setState(() {
          _conversationsList = conversations;
          if (showLoadingIndicator) {
          }
          _filterConversations(); // 添加这一行以确保在加载数据后应用过滤
        });
        debugPrint('获取对话列表成功: 共${conversations.length}个对话');
      } else {
        setState(() {
          _conversationsList = null; // API出错时设为空
          if (showLoadingIndicator) {
          }
          _filteredConversationsList = null; // 同时清空过滤后的列表
        });
        debugPrint('获取对话列表失败: ${response.message}');
      }
    } catch (e) {
      setState(() {
        _conversationsList = null; // API出错时设为空
        if (showLoadingIndicator) {
        }
        _filteredConversationsList = null; // 同时清空过滤后的列表
      });
      debugPrint('获取对话列表时发生错误: $e');
    }
  }

  // 刷新对话列表的方法
  Future<void> _refreshConversationsList() async {
    setState(() {
    });

    try {
      final response = await ChatApi.getConversationsList();

      if (response.success && response.data != null) {
        // 转换API返回的数据格式为需要的格式
        final List<Map<String, dynamic>> conversations = [];
        for (final item in response.data!) {
          conversations.add({
            'ID': item['ID'] ?? '',
            'Title': item['Title'] ?? '新对话',
            'Summary': item['Summary'] ?? '', // 添加摘要字段
            'UpdatedAt': item['UpdatedAt'] ?? '',
          });
        }

        setState(() {
          _conversationsList = conversations;
          _filterConversations(); // 添加这一行以确保在刷新数据后应用过滤
        });
        debugPrint('刷新对话列表成功: 共${conversations.length}个对话');
      } else {
        setState(() {
          _conversationsList = null; // API出错时设为空
          _filteredConversationsList = null; // 同时清空过滤后的列表
        });
        debugPrint('刷新对话列表失败: ${response.message}');

        // 显示错误信息给用户
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('刷新对话列表失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _conversationsList = null; // API出错时设为空
        _filteredConversationsList = null; // 同时清空过滤后的列表
      });
      debugPrint('刷新对话列表时发生错误: $e');

      // 显示错误信息给用户
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('刷新对话列表时发生错误: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  UserInfo? _userInfo;
  bool _hasLoaded = false; // 标记是否已加载过数据

  @override
  void initState() {
    super.initState();
    // 注册到数据更新控制器
    DataUpdateController().onProfilePageActivate = _getUserInfo;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // 页面被激活时加载数据
    if (!_hasLoaded) {
      _getUserInfo();
      _hasLoaded = true;
    }
  }

  @override
  void didUpdateWidget(covariant ProfilePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 页面重新构建时，如果当前页面是可见的，可以考虑更新数据
    // 但这里我们不自动更新，只在用户切换到页面时更新
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 16.0), // 减少顶部内边距
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16.0, top: 8.0), // 减少顶部内边距
            child: Row(
              children: [
                if (_userInfo != null && _userInfo!.username != '未登录')
                  // 用户已登录，不管是否有头像，都不添加点击事件
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    backgroundImage: _userInfo!.avatar != null ? NetworkImage(_userInfo!.avatar!) : null,
                    child: _userInfo!.avatar == null ? Icon(Icons.person, size: 50, color: Theme.of(context).colorScheme.onSurface) : null,
                  )
                else
                  // 未登录状态，添加点击事件跳转到登录页面
                  GestureDetector(
                    onTap: _login,
                    child: CircleAvatar(
                      radius: 50,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: Icon(Icons.person, size: 50, color: Theme.of(context).colorScheme.onSurface),
                    ),
                  ),
                const SizedBox(width: 16),
                if (_userInfo != null && _userInfo!.username != '未登录')
                  // 已登录用户信息，不添加点击事件
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _userInfo?.username ?? '未登录',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _userInfo?.id != null && _userInfo!.username != '未登录'
                            ? '用户ID: ${_userInfo!.id}'
                            : '未登录',
                        style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  )
                else
                  // 未登录状态，添加点击事件跳转到登录页面
                  GestureDetector(
                    onTap: _login,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _userInfo?.username ?? '未登录',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _userInfo?.id != null && _userInfo!.username != '未登录'
                              ? '用户ID: ${_userInfo!.id}'
                              : '未登录',
                          style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16), // 减少间距
          if (_userInfo != null && _userInfo!.username != '未登录')
            Card(
              child: ListTile(
                leading: const Icon(Icons.star, size: 24),
                title: const Text('积分'),
                trailing: Text(
                  _userInfo?.points?.toString() ?? '0',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                onTap: () {
                  // 跳转到积分页面
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => const PointsPage()),
                  );
                },
              ),
            ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                if (_userInfo != null && _userInfo!.username != '未登录') ...[
                  ListTile(
                    leading: const Icon(Icons.account_circle_outlined, size: 24),
                    title: const Text('账户设置'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.settings_outlined, size: 24),
                    title: const Text('应用设置'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.help_outline, size: 24),
                    title: const Text('帮助与反馈'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.logout, size: 24),
                    title: const Text('退出登录'),
                    onTap: _logout,
                  ),
                ] else
                  ListTile(
                    leading: const Icon(Icons.login, size: 24),
                    title: const Text('登录/注册'),
                    onTap: _login,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.notifications_outlined, size: 24),
                  title: const Text('通知设置'),
                  trailing: Switch(value: true, onChanged: (bool value) {}),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, size: 24),
                  title: const Text('隐私政策'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.info_outlined, size: 24),
                  title: const Text('关于应用'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 获取用户信息的方法
  void _getUserInfo() async {
    // 优先使用预加载的数据
    if (_preloadedUserData != null) {
      if (mounted) {
        setState(() {
          _userInfo = UserInfo(
            id: _preloadedUserData!['id'].toString(),
            username: _preloadedUserData!['username'],
            email: _preloadedUserData!['email'],
            avatar: _preloadedUserData!['avatar'],
            points: _preloadedUserData!['points'],
            isVip: _preloadedUserData!['is_vip'] == 1,
            token: _preloadedUserData!['token'],
          );
        });
      }
      // 重置预加载数据，避免重复使用
      _preloadedUserData = null;
      return;
    }

    try {
      final response = await UserApi.getCurrentUser();

      if (response.success && response.data != null) {
        // 创建UserInfo实例
        if (mounted) {
          setState(() {
            _userInfo = UserInfo(
              id: response.data!['id'].toString(),
              username: response.data!['username'],
              email: response.data!['email'],
              avatar: response.data!['avatar'],
              points: response.data!['points'],
              isVip: response.data!['is_vip'] == 1,
              token: response.data!['token'],
            );
          });
        }
      } else if (response.message == '未登录') {
        // 用户未登录，设置为未登录状态，但不显示错误信息
        if (mounted) {
          setState(() {
            _userInfo = UserInfo(
              id: null,
              username: '未登录',
              email: null,
              avatar: null,
              points: null,
              isVip: null,
              token: null,
            );
          });
        }
        debugPrint('用户未登录');
      } else if (response.statusCode == 400) {
        // 400错误表示用户未登录，静默处理，只输出日志
        if (mounted) {
          setState(() {
            _userInfo = UserInfo(
              id: null,
              username: '未登录',
              email: null,
              avatar: null,
              points: null,
              isVip: null,
              token: null,
            );
          });
        }
        debugPrint('用户未登录 (400错误)');
      } else {
        // API请求失败时，设置为未登录状态
        if (mounted) {
          setState(() {
            _userInfo = UserInfo(
              id: null,
              username: '未登录',
              email: null,
              avatar: null,
              points: null,
              isVip: null,
              token: null,
            );
          });
        }
        debugPrint('获取用户信息失败: ${response.message}');

        // 显示错误信息给用户
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('获取用户信息失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      // API请求异常时，设置为未登录状态
      if (mounted) {
        setState(() {
          _userInfo = UserInfo(
            id: null,
            username: '未登录',
            email: null,
            avatar: null,
            points: null,
            isVip: null,
            token: null,
          );
        });
      }
      debugPrint('获取用户信息时发生错误: $e');

      // 显示错误信息给用户
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('获取用户信息时发生错误: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // 登录的方法
  void _login() async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const LoginPage()),
    );

    // 如果登录成功，刷新用户信息
    if (result == true) {
      _getUserInfo();
    }
  }

  // 退出登录的方法
  void _logout() async {
    try {
      final response = await UserApi.logout();

      if (response.success) {
        debugPrint('退出登录成功');

        // 清除本地存储的用户信息
        await LocalStorage.clearUserInfo();

        // 更新UI为未登录状态
        if (mounted) { // 确保widget仍然挂载
          setState(() {
            _userInfo = UserInfo(
              id: null,
              username: '未登录',
              email: null,
              avatar: null,
              points: null,
              isVip: null,
              token: null,
            );
          });
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('已退出登录')),
          );
        }
      } else {
        debugPrint('退出登录失败: ${response.message}');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('退出登录失败: ${response.message}')),
          );
        }
      }
    } catch (e) {
      debugPrint('退出登录时发生错误: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('退出登录时发生错误: $e')),
        );
      }
    }
  }
}

// 积分页面
class PointsPage extends StatelessWidget {
  const PointsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的积分'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.star,
              size: 100,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              '积分页面',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '功能开发中...',
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
}
