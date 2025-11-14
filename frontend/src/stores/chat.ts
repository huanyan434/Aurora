import { defineStore } from 'pinia';
import { getModelsList, getConversationsList } from '@/api/chat';

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
  reasoning?: boolean;
  image?: number; // 0: 无, 1: 有, 3: 有
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
              reasoning: !!apiModel.Reasoning && apiModel.Reasoning !== '', // 推理字段是一个字符串，非空即为true
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
          const firstModelId = firstModel?.id;
          console.log('第一个模型:', firstModel); // 调试日志
          console.log('第一个模型ID:', firstModelId); // 调试日志
          if (firstModelId) {
            this.selectedModel = firstModelId;
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
          { id: 'gpt-4', name: 'GPT-4', reasoning: true, image: 1, points: 20 },
          { id: 'gpt-3.5', name: 'GPT-3.5', points: 5 },
          { id: 'claude', name: 'Claude', reasoning: true, points: 15 },
          { id: 'llama', name: 'Llama', points: 10 },
          { id: 'gemini', name: 'Gemini', image: 1, points: 12 },
          { id: 'mistral', name: 'Mistral', points: 8 }
        ];
        if (this.models.length > 0) {
          this.selectedModel = this.models[0].id;
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
      } catch (error) {
        console.error('删除对话失败:', error);
      }
    }
  },
  
  // 启用持久化
  persist: {
    key: 'chat-store',
    storage: localStorage,
  },
});