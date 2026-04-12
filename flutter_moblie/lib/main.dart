import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:flutter_statusbarcolor_ns/flutter_statusbarcolor_ns.dart';
import 'package:window_size/window_size.dart';
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

  // 检测平台并调整窗口大小（仅在桌面平台上）
  if (!kIsWeb && (defaultTargetPlatform == TargetPlatform.windows ||
      defaultTargetPlatform == TargetPlatform.linux ||
      defaultTargetPlatform == TargetPlatform.macOS)) {
    try {
      setWindowTitle('Aurora Studio');
      setWindowMinSize(const Size(300, 400));
      setWindowMaxSize(Size.infinite);
      // 设置窗口大小
      setWindowFrame(const Rect.fromLTWH(0, 0, 430, 916));
    } catch (e) {
      debugPrint('设置窗口大小时出错: $e');
    }
  }

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
          seedColor: const Color.fromARGB(255, 154, 218, 185),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 40, 207, 121),
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
      title: 'Aurora Studio',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 154, 218, 185),
          brightness: Brightness.light, // 明亮主题
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 40, 207, 121),
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
    return SingleChildScrollView(
      child: Padding(
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
class PointsPage extends StatefulWidget {
  const PointsPage({super.key});

  @override
  State<PointsPage> createState() => _PointsPageState();
}

class _PointsPageState extends State<PointsPage> with TickerProviderStateMixin {
  bool _isSignedIn = false;
  bool _isLoading = true;
  int _currentPoints = 0; // 当前积分
  List<Map<String, dynamic>> _pointsHistory = []; // 积分历史记录
  bool _historyLoading = true; // 历史记录加载状态

  late AnimationController _signAnimationController;
  late Animation<double> _signAnimation;

  @override
  void initState() {
    super.initState();
    _signAnimationController = AnimationController(
      duration: Duration(milliseconds: 500),
      vsync: this,
    );
    _signAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _signAnimationController, curve: Curves.elasticOut));

    _checkSignInStatus();
    _getCurrentPoints();
    _getPointsHistory();
  }

  @override
  void dispose() {
    _signAnimationController.dispose();
    super.dispose();
  }

  // 获取当前积分
  void _getCurrentPoints() async {
    try {
      final response = await UserApi.getCurrentUser();

      if (response.success && response.data != null) {
        setState(() {
          _currentPoints = response.data!['points'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint('获取当前积分失败: $e');
    }
  }

  // 检查签到状态
  void _checkSignInStatus() async {
    try {
      final response = await UserApi.getSignStatus();

      if (response.success && response.data != null) {
        setState(() {
          _isSignedIn = response.data!['signed'] ?? false;  // 后端返回的字段是 'signed' 而不是 'has_signed'
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('获取签到状态失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('检查签到状态时发生错误: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // 获取积分历史记录
  void _getPointsHistory() async {
    setState(() {
      _historyLoading = true;
    });

    try {
      // 调用后端API获取积分记录
      final response = await UserApi.getPointsRecords();

      if (response.success && response.data != null) {
        setState(() {
          _pointsHistory = response.data!.map((record) {
            // 解析后端返回的数据
            int amount = record['amount'] ?? 0;
            String amountStr = amount > 0 ? '+$amount' : '$amount';
            String type = amount > 0 ? '奖励' : '消费';

            // 根据原因确定类型
            String reason = record['reason'] ?? '';
            if (reason.contains('签到')) {
              type = '签到';
            } else if (reason.contains('充值')) {
              type = '充值';
            }

            return {
              'type': type,
              'amount': amountStr,
              'date': record['timestamp']?.split(' ')[1]?.substring(0, 5) ?? '', // 提取时间部分
              'description': reason,
              'full_date': record['timestamp'] ?? '', // 完整日期时间
            };
          }).toList();
          _historyLoading = false;
        });
      } else {
        setState(() {
          _historyLoading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('获取积分记录失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _historyLoading = false;
      });
      debugPrint('获取积分历史记录失败: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('获取积分历史记录失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // 执行签到
  void _performSignIn() async {
    try {
      setState(() {
        _isLoading = true;
      });

      final response = await UserApi.sign();

      if (response.success) {
        setState(() {
          _isSignedIn = true;
          _isLoading = false;
        });

        // 播放签到动画
        if (_signAnimationController.status == AnimationStatus.dismissed) {
          _signAnimationController.forward().then((_) {
            // 动画结束后重置
            Future.delayed(Duration(seconds: 1)).then((_) {
              if (mounted) {
                _signAnimationController.reset();
              }
            });
          });
        }

        if (mounted) {
          // 从响应中获取获得的积分数量
          int gainedPoints = 0;
          int consecutiveDays = 0;
          bool hasExtraReward = false;
          int multiplier = 1; // 奖励倍数，默认为1

          if (response.data != null && response.data!['data'] != null) {
            final data = response.data!['data'];
            gainedPoints = data['points'] ?? 0;
            consecutiveDays = data['consecutive_days'] ?? 0;
            hasExtraReward = data['has_extra_reward'] ?? false;
            multiplier = data['multiplier'] ?? 1;
          }

          // 更新状态
          setState(() {
            _currentPoints += gainedPoints;

            // 添加到历史记录顶部
            _pointsHistory.insert(0, {
              'type': '签到',
              'amount': '+$gainedPoints',
              'date': '今天 ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}',
              'description': '每日签到奖励${hasExtraReward ? ' (连续签到惊喜)' : ''}'
            });
          });

          // 显示签到成功的提示
          String snackBarText = '签到成功！获得 $gainedPoints 积分奖励';
          if (hasExtraReward && multiplier > 1) {
            String multiplierText = '';
            switch (multiplier) {
              case 2:
                multiplierText = '2倍';
                break;
              case 3:
                multiplierText = '3倍';
                break;
              case 4:
                multiplierText = '4倍';
                break;
              default:
                multiplierText = '$multiplier倍';
            }
            snackBarText += '\n🎉 连续签到 $consecutiveDays 天，获得$multiplierText奖励！';
          }

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(snackBarText),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        setState(() {
          _isLoading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('签到失败: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('签到时发生错误: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的积分'),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _checkSignInStatus();
          _getCurrentPoints();
          _getPointsHistory();
        },
        child: SingleChildScrollView(
          physics: AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 积分展示卡片
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Theme.of(context).colorScheme.primary.withOpacity(0.08),
                        Theme.of(context).colorScheme.secondary.withOpacity(0.08),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context).colorScheme.shadow.withOpacity(0.08),
                        blurRadius: 12,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Text(
                        '当前积分',
                        style: TextStyle(
                          fontSize: 16,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 12),
                      AnimatedBuilder(
                        animation: _signAnimationController,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _signAnimation.isDismissed ? 1.0 : _signAnimation.value,
                            child: Text(
                              '$_currentPoints',
                              style: TextStyle(
                                fontSize: 64,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'POINTS',
                        style: TextStyle(
                          fontSize: 16,
                          letterSpacing: 2,
                          color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // 签到区域
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.event_available,
                              color: Theme.of(context).colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '每日签到',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (_isLoading)
                          const Center(child: CircularProgressIndicator())
                        else
                          Column(
                            children: [
                              ElevatedButton(
                                onPressed: _isSignedIn ? null : _performSignIn,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _isSignedIn
                                      ? Colors.grey
                                      : Theme.of(context).colorScheme.primary,
                                  foregroundColor: Colors.white,
                                  minimumSize: Size(double.infinity, 56),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: _isSignedIn
                                  ? Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.check_circle, size: 20),
                                        const SizedBox(width: 8),
                                        Text(
                                          '今日已签到',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    )
                                  : Text(
                                      '立即签到',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _isSignedIn
                                    ? '您今天已经签到过了，明天记得再来哦！'
                                    : '每天签到可获得积分奖励，连续签到还有额外惊喜！',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // 积分历史记录标题
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '积分历史',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    TextButton(
                      onPressed: _getPointsHistory,
                      child: Text(
                        '刷新',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // 积分历史记录列表
                if (_historyLoading)
                  Container(
                    padding: EdgeInsets.all(20),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (_pointsHistory.isEmpty)
                  Container(
                    padding: EdgeInsets.all(20),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.history,
                            size: 64,
                            color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.3),
                          ),
                          SizedBox(height: 16),
                          Text(
                            '暂无积分记录',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: NeverScrollableScrollPhysics(),
                      itemCount: _pointsHistory.length,
                      separatorBuilder: (context, index) => Divider(
                        height: 1,
                        thickness: 1,
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      ),
                      itemBuilder: (context, index) {
                        final record = _pointsHistory[index];
                        Color amountColor = record['amount'].startsWith('+')
                            ? Colors.green
                            : Colors.red;

                        IconData iconData = record['type'] == '签到'
                            ? Icons.add_circle_outline
                            : record['type'] == '奖励'
                                ? Icons.card_giftcard_outlined
                                : Icons.remove_circle_outline;

                        return ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: amountColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              iconData,
                              color: amountColor,
                            ),
                          ),
                          title: Text(
                            record['description'],
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          subtitle: Text(
                            record['date'],
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          trailing: Text(
                            record['amount'],
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: amountColor,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
