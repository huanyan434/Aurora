import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getModelsList, getConversationsList } from '@/api/chat';

// 定义消息类型
export interface Message {
  id: number;
  conversationID: number;
  role: 'user' | 'assistant';
  content: string;
  base64?: string; // 用于存储图片的base64数据
  reasoningContent?: string; // 推理内容
  reasoningTime?: number; // 推理时间
  isStreaming?: boolean; // 是否正在流式传输
  createdAt: string;
}

// 定义API返回的对话类型
interface ApiConversation {
  ID: number;
  UserID: number;
  Title: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// 定义内部使用的对话类型
export interface Conversation {
  id: number;
  userID: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiModel {
  ID: string;
  Name: string;
  Points: number;
  Reasoning: string; // 从日志看，推理字段是一个字符串，而非布尔值
  Tool: number;
  Image?: number;
  Description?: string;
}

export interface Model {
  id: string;
  name: string;
  reasoning?: string;
  image?: number;
  points?: number;
  description?: string;
  tool?: number;
}

export interface ModelsListResponse {
  models: Model[];
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    models: [] as Model[],
    selectedModel: 'gpt-4', // 默认选中GPT-4
    modelsLoaded: false, // 标记模型是否已加载
    conversations: [] as Conversation[],
    conversationsLoaded: false, // 标记对话列表是否已加载
    // 修复 Map 响应性问题（遵循规范）- 使用普通对象代替 Map
    messages: {} as Record<number, Message[]>,
  }),
  
  getters: {
    currentModel: (state) => {
      return state.models.find(model => model.id === state.selectedModel);
    },
    
    sortedModels: (state) => {
      return [...state.models].sort((a, b) => {
        // 确保name属性存在再进行比较
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'zh-CN');
      });
    },
    
    sortedConversations: (state) => {
      return [...state.conversations]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    // 获取特定对话的消息
    getMessagesByConversationId: (state) => (conversationId: number) => {
      return state.messages[conversationId] || [];
    }
  },
  
  actions: {
    async fetchModels() {
      try {
        const response = await getModelsList();
        console.log('API响应:', response); // 调试日志
        
        // 确保response.data.models存在
        if (response.data && response.data.models) {
          // 将API响应的数据转换为内部格式
          this.models = response.data.models.map((apiModel: ApiModel) => {
            const model: Model = {
              id: apiModel.ID,
              name: apiModel.Name,
              points: apiModel.Points,
              reasoning: apiModel.Reasoning,
              tool: apiModel.Tool
            };
            // 如果有其他可选字段，也要处理
            if (apiModel.Image !== undefined) model.image = apiModel.Image;
            if (apiModel.Description) model.description = apiModel.Description;
            return model;
          });
          console.log('转换后的模型数据:', this.models); // 调试日志
        } else {
          this.models = [];
        }
        this.modelsLoaded = true;
        
        // 检查保存的模型是否仍然有效，如果无效则设置默认模型
        const savedModel = localStorage.getItem('selectedModel');
        console.log('保存的模型:', savedModel); // 调试日志
        if (savedModel && this.models.some(model => model.id === savedModel)) {
          this.selectedModel = savedModel;
          console.log('使用保存的模型:', this.selectedModel); // 调试日志
        } else if (this.models.length > 0) {
          // 如果没有保存的模型或模型无效，使用第一个模型
          const firstModel = this.models[0];
          // 修复类型检查问题
          if (firstModel && firstModel.id) {
            this.selectedModel = firstModel.id;
            console.log('设置默认模型:', this.selectedModel); // 调试日志
          } else {
            console.error('第一个模型ID为空或不存在:', firstModel); // 调试日志
          }
        } else {
          console.warn('没有可用的模型'); // 调试日志
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
        // 如果获取失败，使用默认模型列表
        this.models = [
          { id: 'gpt-4', name: 'GPT-4', reasoning: 'gpt-4', image: 1, points: 20 }
        ];
        // 修复类型检查问题
        if (this.models.length > 0) {
          const firstModel = this.models[0];
          if (firstModel && firstModel.id) {
            this.selectedModel = firstModel.id;
          }
        }
        this.modelsLoaded = true;
      }
    },
    
    async fetchConversations() {
      try {
        const response = await getConversationsList();
        if (response.data.success) {
          // 将API返回的数据转换为内部格式
          this.conversations = response.data.conversations.map((apiConv: ApiConversation) => ({
            id: apiConv.ID,
            userID: apiConv.UserID,
            title: apiConv.Title,
            createdAt: apiConv.CreatedAt,
            updatedAt: apiConv.UpdatedAt
          }));
          this.conversationsLoaded = true;
        } else {
          console.error('获取对话列表失败:', response.data.error);
          this.conversations = [];
        }
      } catch (error) {
        console.error('获取对话列表失败:', error);
        this.conversations = [];
      }
    },
    
    setSelectedModel(modelId: string) {
      this.selectedModel = modelId;
      // 保存到localStorage或其他持久化存储
      localStorage.setItem('selectedModel', modelId);
    },
    
    loadSelectedModel() {
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel && this.models.some(model => model.id === savedModel)) {
        this.selectedModel = savedModel;
      }
    },
    
    // 重命名对话
    async renameConversation(conversationId: number, newTitle: string) {
      try {
        // 这里应该调用API来重命名对话
        // 为简化起见，我们直接更新本地状态
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (conversation) {
          conversation.title = newTitle;
        }
      } catch (error) {
        console.error('重命名对话失败:', error);
      }
    },
    
    // 删除对话
    async deleteConversation(conversationId: number) {
      try {
        // 这里应该调用API来删除对话
        // 为简化起见，我们直接更新本地状态
        this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
        // 同时删除该对话的所有消息
        delete this.messages[conversationId];
      } catch (error) {
        console.error('删除对话失败:', error);
      }
    },

    // 添加消息到指定对话
    addMessage(conversationId: number, message: Message) {
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = [];
      }
      
      this.messages[conversationId].push(message);
    },

    // 更新指定消息
    updateMessage(messageId: number, updates: Partial<Message>) {
      // 遍历所有对话的消息查找对应的消息
      for (const conversationId in this.messages) {
        const messages = this.messages[conversationId];
        if (messages) {
          const messageIndex = messages.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            // 创建更新后的消息对象
            const updatedMessage = { ...messages[messageIndex], ...updates };
            // 更新消息数组
            messages[messageIndex] = updatedMessage as Message;
            // 触发Vue的响应式更新
            this.messages = { ...this.messages };
            break;
          }
        }
      }
    },

    // 移除指定消息
    removeMessage(messageId: number) {
      // 遍历所有对话的消息查找并删除对应的消息
      for (const conversationId in this.messages) {
        const messages = this.messages[conversationId];
        if (messages) {
          const messageIndex = messages.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            messages.splice(messageIndex, 1);
            // 触发Vue的响应式更新
            this.messages = { ...this.messages };
            break;
          }
        }
      }
    },

    // 设置指定对话的所有消息
    setMessages(conversationId: number, messages: Message[]) {
      this.messages[conversationId] = messages;
    },

    // 删除指定对话的所有消息
    deleteMessagesByConversationId(conversationId: number) {
      delete this.messages[conversationId];
    }
  },
});