// AI服务连接接口
class AIService {
    constructor(apiKey, model = 'deepseek-chat', provider = 'deepseek') {
        this.apiKey = apiKey;
        this.model = model;
        this.provider = provider;
        
        // 根据不同的AI提供商设置不同的API端点
        if (provider === 'openai') {
            this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        } else if (provider === 'deepseek') {
            this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        } else {
            console.error('不支持的AI提供商');
        }
    }

    // 设置模型名称
    setModel(modelName) {
        this.modelName = modelName;
        return this;
    }

    // 生成健身计划
    async generateWorkoutPlan(userData) {
        const prompt = this._createWorkoutPrompt(userData);
        return this._callAPI(prompt);
    }

    // 生成饮食计划
    async generateMealPlan(userData) {
        const prompt = this._createMealPrompt(userData);
        return this._callAPI(prompt);
    }

    // 创建健身计划提示词
    _createWorkoutPrompt(userData) {
        return [
            {
                role: "system",
                content: `你是一位专业的健身教练，擅长根据个人情况制定定制化的健身计划。请根据以下用户信息，创建一个详细的一周健身计划。
                计划应包括每天的训练内容，每个动作的组数、次数和休息时间，以及适当的训练强度建议。`
            },
            {
                role: "user",
                content: `请为我制定一周健身计划，以下是我的个人信息：
                - 性别：${userData.gender}
                - 年龄：${userData.age}
                - 身高：${userData.height}cm
                - 体重：${userData.weight}kg
                - 健身目标：${this._translateGoal(userData.goal)}
                - 健身经验：${this._translateExperience(userData.workoutExperience)}
                - 每周可健身天数：${userData.workoutDays}天
                - 每次训练时长：${userData.workoutDuration}分钟
                - 日常活动水平：${this._translateActivityLevel(userData.activityLevel)}
                
                请提供详细的训练计划，包括具体动作、组数、次数和休息时间。`
            }
        ];
    }

    // 创建饮食计划提示词
    _createMealPrompt(userData) {
        let dietaryRestrictions = "无特殊限制";
        if (userData.dietaryRestrictions && userData.dietaryRestrictions.length > 0) {
            dietaryRestrictions = userData.dietaryRestrictions.map(r => this._translateDietaryRestriction(r)).join('、');
        }

        return [
            {
                role: "system",
                content: `你是一位专业的营养师，擅长根据个人情况制定定制化的饮食计划。请根据以下用户信息，创建一个详细的一周饮食计划。
                计划应包括每天的三餐和加餐内容，每餐的大致卡路里，以及主要的宏量营养素分配。`
            },
            {
                role: "user",
                content: `请为我制定一周饮食计划，以下是我的个人信息：
                - 性别：${userData.gender}
                - 年龄：${userData.age}
                - 身高：${userData.height}cm
                - 体重：${userData.weight}kg
                - 健身目标：${this._translateGoal(userData.goal)}
                - 日常活动水平：${this._translateActivityLevel(userData.activityLevel)}
                - 饮食限制：${dietaryRestrictions}
                
                请提供详细的饮食计划，包括每餐的食物选择、大致卡路里和宏量营养素分配。`
            }
        ];
    }

    // 调用AI API
    async _callAPI(messages) {
        try {
            // 准备请求参数
            const requestBody = {
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            };
            
            // 根据不同的提供商设置不同的模型参数
            if (this.provider === 'openai') {
                requestBody.model = this.model || 'gpt-3.5-turbo';
            } else if (this.provider === 'deepseek') {
                requestBody.model = this.model || 'deepseek-chat';
            }
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API调用失败: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('AI API调用错误:', error);
            return `生成计划时出错: ${error.message}`;
        }
    }

    // 翻译健身目标
    _translateGoal(goal) {
        const goals = {
            'loseWeight': '减肥',
            'maintainWeight': '保持体重',
            'gainWeight': '增重',
            'buildMuscle': '增肌'
        };
        return goals[goal] || goal;
    }

    // 翻译健身经验
    _translateExperience(experience) {
        const experiences = {
            'beginner': '初学者',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return experiences[experience] || experience;
    }

    // 翻译活动水平
    _translateActivityLevel(level) {
        const levels = {
            'sedentary': '久坐不动',
            'light': '轻度活动',
            'moderate': '中度活动',
            'active': '积极活动',
            'veryActive': '非常活跃'
        };
        return levels[level] || level;
    }

    // 翻译饮食限制
    _translateDietaryRestriction(restriction) {
        const restrictions = {
            'vegetarian': '素食主义',
            'vegan': '纯素食主义',
            'glutenFree': '无麸质',
            'lactoseFree': '无乳糖',
            'nutFree': '无坚果'
        };
        return restrictions[restriction] || restriction;
    }
}

// 导出AI服务类
window.AIService = AIService;