// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const userInfoForm = document.getElementById('userInfoForm');
    const resultsSection = document.getElementById('results');
    const mealPlanContent = document.getElementById('meal-plan-content');
    const workoutPlanContent = document.getElementById('workout-plan-content');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const downloadPlanBtn = document.getElementById('downloadPlan');
    const sharePlanBtn = document.getElementById('sharePlan');
    
    // 初始化AI服务
    let aiService = null;
    try {
        // 从本地存储获取API密钥
        const apiKey = localStorage.getItem('ai_api_key');
        if (apiKey) {
            aiService = new AIService(apiKey);
            console.log('AI服务已初始化');
        }
    } catch (error) {
        console.error('初始化AI服务失败:', error);
    }
    
    // 用户数据对象
    let userData = {};
    let generatedPlans = {
        mealPlan: null,
        workoutPlan: null
    };
    
    // 检查是否使用AI生成
    const useAI = localStorage.getItem('use_ai') === 'true';
    
    // 表单提交处理
    userInfoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 收集表单数据
        const formData = new FormData(userInfoForm);
        userData = {};
        
        // 将表单数据转换为对象
        for (const [key, value] of formData.entries()) {
            if (key === 'dietaryRestrictions') {
                if (!userData[key]) {
                    userData[key] = [];
                }
                userData[key].push(value);
            } else {
                userData[key] = value;
            }
        }
        
        // 生成计划
        generatePlans(userData);
        
        // 显示结果区域
        resultsSection.style.display = 'block';
        
        // 滚动到结果区域
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // 上传数据到后台
        uploadUserData(userData);
    });
    
    // 标签切换功能
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有标签的活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // 添加当前标签的活动状态
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // 下载计划功能
    downloadPlanBtn.addEventListener('click', function() {
        downloadPlans();
    });
    
    // 分享计划功能
    sharePlanBtn.addEventListener('click', function() {
        sharePlans();
    });
    
    // 生成计划函数
    async function generatePlans(userData) {
        // 显示加载状态
        mealPlanContent.innerHTML = '<div class="loading">正在生成个性化计划，请稍候...</div>';
        workoutPlanContent.innerHTML = '<div class="loading">正在生成个性化计划，请稍候...</div>';
        
        try {
            if (useAI && aiService) {
                // 使用AI服务生成计划
                console.log('使用AI服务生成计划');
                
                // 并行请求AI生成计划
                const [mealPlanText, workoutPlanText] = await Promise.all([
                    aiService.generateMealPlan(userData),
                    aiService.generateWorkoutPlan(userData)
                ]);
                
                // 解析AI生成的计划
                const mealPlan = parseAIMealPlan(mealPlanText);
                const workoutPlan = parseAIWorkoutPlan(workoutPlanText);
                
                generatedPlans.mealPlan = mealPlan;
                generatedPlans.workoutPlan = workoutPlan;
                
                // 保存原始AI响应用于下载
                generatedPlans.rawAIResponse = {
                    mealPlan: mealPlanText,
                    workoutPlan: workoutPlanText
                };
            } else {
                // 使用本地算法生成计划
                console.log('使用本地算法生成计划');
                
                // 根据用户数据生成食谱计划
                const mealPlan = generateMealPlan(userData);
                generatedPlans.mealPlan = mealPlan;
                
                // 根据用户数据生成健身计划
                const workoutPlan = generateWorkoutPlan(userData);
                generatedPlans.workoutPlan = workoutPlan;
            }
            
            // 渲染食谱计划
            renderMealPlan(generatedPlans.mealPlan);
            
            // 渲染健身计划
            renderWorkoutPlan(generatedPlans.workoutPlan);
        } catch (error) {
            console.error('生成计划出错:', error);
            mealPlanContent.innerHTML = `<div class="error">生成计划时出错: ${error.message}</div>`;
            workoutPlanContent.innerHTML = `<div class="error">生成计划时出错: ${error.message}</div>`;
        }
    }
    
    // 解析AI生成的饮食计划
    function parseAIMealPlan(aiResponse) {
        try {
            // 这里是简化的解析逻辑，实际应用中可能需要更复杂的解析
            const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            const mealTypes = ['早餐', '午餐', '晚餐', '加餐'];
            
            // 创建一周的食谱计划
            const weekPlan = {};
            
            // 尝试从AI响应中提取每天的饮食计划
            weekdays.forEach(day => {
                weekPlan[day] = {};
                
                // 为每一餐创建默认值
                mealTypes.forEach(mealType => {
                    weekPlan[day][mealType] = {
                        name: '未能从AI响应中提取',
                        calories: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                        portion: '1份'
                    };
                });
                
                // 尝试从AI响应中提取该天的信息
                const dayRegex = new RegExp(`${day}[：:](.*?)(?=(?:周[一二三四五六日][：:])|$)`, 's');
                const dayMatch = aiResponse.match(dayRegex);
                
                if (dayMatch && dayMatch[1]) {
                    const dayContent = dayMatch[1].trim();
                    
                    // 提取每一餐
                    mealTypes.forEach(mealType => {
                        const mealRegex = new RegExp(`${mealType}[：:](.*?)(?=(?:[早午晚]餐|加餐)[：:]|$)`, 's');
                        const mealMatch = dayContent.match(mealRegex);
                        
                        if (mealMatch && mealMatch[1]) {
                            const mealContent = mealMatch[1].trim();
                            
                            // 提取卡路里信息
                            const caloriesMatch = mealContent.match(/(\d+)\s*[千卡路里]/);
                            const proteinMatch = mealContent.match(/蛋白质[：:]\s*(\d+)g/i);
                            const carbsMatch = mealContent.match(/碳水[：:]\s*(\d+)g/i);
                            const fatMatch = mealContent.match(/脂肪[：:]\s*(\d+)g/i);
                            
                            weekPlan[day][mealType] = {
                                name: mealContent.split('\n')[0].replace(/[（(].*[)）]/, '').trim(),
                                calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
                                protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
                                carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
                                fat: fatMatch ? parseInt(fatMatch[1]) : 0,
                                portion: '1份'
                            };
                        }
                    });
                }
            });
            
            return weekPlan;
        } catch (error) {
            console.error('解析AI饮食计划出错:', error);
            return generateMealPlan(userData); // 失败时回退到本地生成
        }
    }
    
    // 解析AI生成的健身计划
    function parseAIWorkoutPlan(aiResponse) {
        try {
            // 这里是简化的解析逻辑，实际应用中可能需要更复杂的解析
            const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            
            // 创建一周的健身计划
            const weekPlan = {};
            
            // 尝试从AI响应中提取每天的健身计划
            weekdays.forEach(day => {
                // 默认为休息日
                weekPlan[day] = {
                    type: '休息',
                    exercises: []
                };
                
                // 尝试从AI响应中提取该天的信息
                const dayRegex = new RegExp(`${day}[：:](.*?)(?=(?:周[一二三四五六日][：:])|$)`, 's');
                const dayMatch = aiResponse.match(dayRegex);
                
                if (dayMatch && dayMatch[1]) {
                    const dayContent = dayMatch[1].trim();
                    
                    // 提取训练类型
                    const typeMatch = dayContent.match(/训练类型[：:]\s*(.*?)(?=\n|$)/);
                    const type = typeMatch ? typeMatch[1].trim() : '全身训练';
                    
                    // 提取训练动作
                    const exercises = [];
                    const exerciseMatches = dayContent.matchAll(/(\d+)[\.、]\s*(.*?)(?=\n\d+[\.、]|\n\n|$)/gs);
                    
                    for (const match of exerciseMatches) {
                        const exerciseName = match[2].split('\n')[0].trim();
                        const exerciseDetails = match[2].trim();
                        
                        // 提取组数、次数和休息时间
                        const setsMatch = exerciseDetails.match(/(\d+)\s*组/);
                        const repsMatch = exerciseDetails.match(/(\d+[-\d+]*)\s*次/);
                        const restMatch = exerciseDetails.match(/休息[：:]\s*(\d+)\s*秒/);
                        
                        exercises.push({
                            name: exerciseName,
                            sets: setsMatch ? setsMatch[1] + '组' : '3组',
                            reps: repsMatch ? repsMatch[1] + '次' : '10次',
                            rest: restMatch ? restMatch[1] + '秒' : '60秒',
                            notes: exerciseDetails
                        });
                    }
                    
                    weekPlan[day] = {
                        type: type,
                        exercises: exercises.length > 0 ? exercises : [{
                            name: '未能从AI响应中提取具体动作',
                            sets: '3组',
                            reps: '10次',
                            rest: '60秒',
                            notes: dayContent
                        }]
                    };
                }
            });
            
            return weekPlan;
        } catch (error) {
            console.error('解析AI健身计划出错:', error);
            return generateWorkoutPlan(userData); // 失败时回退到本地生成
        }
    }
    
    // 生成食谱计划
    function generateMealPlan(userData) {
        // 这里是简化的食谱生成逻辑，实际应用中可能需要更复杂的算法
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const mealTypes = ['早餐', '午餐', '晚餐', '加餐'];
        
        // 根据用户目标确定每日卡路里
        let dailyCalories = calculateDailyCalories(userData);
        
        // 创建一周的食谱计划
        const weekPlan = {};
        
        weekdays.forEach(day => {
            weekPlan[day] = {};
            
            // 分配每餐的卡路里
            const breakfastCalories = Math.round(dailyCalories * 0.3);
            const lunchCalories = Math.round(dailyCalories * 0.35);
            const dinnerCalories = Math.round(dailyCalories * 0.25);
            const snackCalories = Math.round(dailyCalories * 0.1);
            
            // 根据用户的饮食限制生成食物
            weekPlan[day]['早餐'] = generateMeal('早餐', breakfastCalories, userData.dietaryRestrictions);
            weekPlan[day]['午餐'] = generateMeal('午餐', lunchCalories, userData.dietaryRestrictions);
            weekPlan[day]['晚餐'] = generateMeal('晚餐', dinnerCalories, userData.dietaryRestrictions);
            weekPlan[day]['加餐'] = generateMeal('加餐', snackCalories, userData.dietaryRestrictions);
        });
        
        return weekPlan;
    }
    
    // 计算每日卡路里需求
    function calculateDailyCalories(userData) {
        // 基础代谢率(BMR)计算 - 使用修订版的Harris-Benedict公式
        let bmr = 0;
        
        if (userData.gender === 'male') {
            bmr = 88.362 + (13.397 * parseFloat(userData.weight)) + (4.799 * parseFloat(userData.height)) - (5.677 * parseFloat(userData.age));
        } else {
            bmr = 447.593 + (9.247 * parseFloat(userData.weight)) + (3.098 * parseFloat(userData.height)) - (4.330 * parseFloat(userData.age));
        }
        
        // 活动系数
        let activityFactor = 1.2; // 默认为久坐不动
        
        switch(userData.activityLevel) {
            case 'sedentary':
                activityFactor = 1.2;
                break;
            case 'light':
                activityFactor = 1.375;
                break;
            case 'moderate':
                activityFactor = 1.55;
                break;
            case 'active':
                activityFactor = 1.725;
                break;
            case 'veryActive':
                activityFactor = 1.9;
                break;
        }
        
        // 总热量需求
        let tdee = bmr * activityFactor;
        
        // 根据目标调整卡路里
        switch(userData.goal) {
            case 'loseWeight':
                tdee -= 500; // 减少500卡路里用于减肥
                break;
            case 'gainWeight':
            case 'buildMuscle':
                tdee += 500; // 增加500卡路里用于增重/增肌
                break;
            // 保持体重不需要调整
        }
        
        return Math.round(tdee);
    }
    
    // 生成单餐食物
    function generateMeal(mealType, calories, restrictions) {
        // 这里是简化的食物生成逻辑，实际应用中可能需要食物数据库和更复杂的算法
        const meals = {
            '早餐': [
                { name: '全麦面包配鸡蛋和牛奶', calories: 400, protein: 20, carbs: 40, fat: 15, restrictions: [] },
                { name: '燕麦粥配水果和坚果', calories: 350, protein: 10, carbs: 50, fat: 10, restrictions: ['lactoseFree'] },
                { name: '蔬菜煎蛋卷', calories: 300, protein: 18, carbs: 5, fat: 22, restrictions: ['glutenFree'] },
                { name: '豆浆配全麦馒头', calories: 380, protein: 15, carbs: 60, fat: 5, restrictions: ['lactoseFree', 'vegetarian'] },
                { name: '水果沙拉配酸奶', calories: 250, protein: 8, carbs: 45, fat: 5, restrictions: ['vegetarian', 'glutenFree'] }
            ],
            '午餐': [
                { name: '糙米饭配鸡胸肉和蔬菜', calories: 550, protein: 35, carbs: 65, fat: 10, restrictions: ['glutenFree'] },
                { name: '全麦三明治配金枪鱼沙拉', calories: 500, protein: 30, carbs: 50, fat: 20, restrictions: [] },
                { name: '藜麦沙拉配烤豆腐', calories: 450, protein: 20, carbs: 55, fat: 15, restrictions: ['vegetarian', 'glutenFree'] },
                { name: '意大利面配番茄酱和瘦肉丸', calories: 600, protein: 25, carbs: 80, fat: 15, restrictions: [] },
                { name: '蔬菜炒饭配鸡蛋', calories: 480, protein: 15, carbs: 70, fat: 12, restrictions: ['vegetarian'] }
            ],
            '晚餐': [
                { name: '烤三文鱼配蒸蔬菜和红薯', calories: 520, protein: 40, carbs: 40, fat: 20, restrictions: ['glutenFree'] },
                { name: '瘦牛肉炒西兰花配糙米', calories: 580, protein: 35, carbs: 60, fat: 15, restrictions: ['glutenFree'] },
                { name: '豆腐蔬菜汤配全麦面包', calories: 400, protein: 20, carbs: 50, fat: 10, restrictions: ['vegetarian'] },
                { name: '烤鸡胸肉配藜麦和烤蔬菜', calories: 500, protein: 40, carbs: 45, fat: 15, restrictions: ['glutenFree'] },
                { name: '蔬菜咖喱配糙米', calories: 450, protein: 15, carbs: 65, fat: 12, restrictions: ['vegetarian', 'glutenFree', 'vegan'] }
            ],
            '加餐': [
                { name: '希腊酸奶配蓝莓', calories: 200, protein: 15, carbs: 20, fat: 5, restrictions: ['vegetarian', 'glutenFree'] },
                { name: '苹果配杏仁酱', calories: 180, protein: 5, carbs: 25, fat: 8, restrictions: ['vegetarian', 'glutenFree', 'lactoseFree', 'vegan'] },
                { name: '蛋白质奶昔', calories: 220, protein: 25, carbs: 15, fat: 3, restrictions: [] },
                { name: '混合坚果', calories: 210, protein: 8, carbs: 10, fat: 18, restrictions: ['vegetarian', 'glutenFree', 'lactoseFree', 'vegan'] },
                { name: '胡萝卜条配鹰嘴豆泥', calories: 150, protein: 6, carbs: 20, fat: 5, restrictions: ['vegetarian', 'glutenFree', 'lactoseFree', 'vegan'] }
            ]
        };
        
        // 过滤掉不符合饮食限制的食物
        let availableMeals = meals[mealType].filter(meal => {
            if (!restrictions) return true;
            
            // 检查每个限制条件
            if (Array.isArray(restrictions)) {
                for (const restriction of restrictions) {
                    if (!meal.restrictions.includes(restriction)) {
                        return false;
                    }
                }
            }
            return true;
        });
        
        // 如果没有符合条件的食物，使用所有食物
        if (availableMeals.length === 0) {
            availableMeals = meals[mealType];
        }
        
        // 随机选择一个食物
        const randomIndex = Math.floor(Math.random() * availableMeals.length);
        const selectedMeal = availableMeals[randomIndex];
        
        // 调整食物份量以匹配目标卡路里
        const portionMultiplier = calories / selectedMeal.calories;
        
        return {
            name: selectedMeal.name,
            calories: Math.round(selectedMeal.calories * portionMultiplier),
            protein: Math.round(selectedMeal.protein * portionMultiplier),
            carbs: Math.round(selectedMeal.carbs * portionMultiplier),
            fat: Math.round(selectedMeal.fat * portionMultiplier),
            portion: portionMultiplier.toFixed(1) + '份'
        };
    }
    
    // 生成健身计划
    function generateWorkoutPlan(userData) {
        // 这里是简化的健身计划生成逻辑，实际应用中可能需要更复杂的算法
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const workoutDays = parseInt(userData.workoutDays);
        const workoutExperience = userData.workoutExperience;
        const goal = userData.goal;
        
        // 创建一周的健身计划
        const weekPlan = {};
        
        // 确定训练日和休息日
        const trainingDays = weekdays.slice(0, workoutDays);
        const restDays = weekdays.slice(workoutDays);
        
        // 根据目标和经验水平选择适当的训练类型
        let workoutTypes = [];
        
        if (goal === 'loseWeight') {
            workoutTypes = ['有氧训练', '全身力量训练', 'HIIT训练', '有氧训练', '全身力量训练', 'HIIT训练', '休息'];
        } else if (goal === 'buildMuscle') {
            workoutTypes = ['胸部和三头肌', '背部和二头肌', '腿部和肩部', '胸部和三头肌', '背部和二头肌', '腿部和肩部', '休息'];
        } else if (goal === 'maintainWeight') {
            workoutTypes = ['全身力量训练', '有氧训练', '核心训练', '全身力量训练', '有氧训练', '灵活性训练', '休息'];
        } else { // gainWeight
            workoutTypes = ['胸部和肩部', '背部和手臂', '腿部', '胸部和肩部', '背部和手臂', '腿部', '休息'];
        }
        
        // 为每个训练日分配训练类型
        trainingDays.forEach((day, index) => {
            weekPlan[day] = {
                type: workoutTypes[index],
                exercises: generateExercises(workoutTypes[index], workoutExperience, userData.workoutDuration)
            };
        });
        
        // 为休息日分配活动
        restDays.forEach(day => {
            weekPlan[day] = {
                type: '休息',
                exercises: [{
                    name: '轻度伸展',
                    sets: '1',
                    reps: '5-10分钟',
                    rest: '无',
                    notes: '轻度伸展和放松，促进恢复'
                }]
            };
        });
        
        return weekPlan;
    }
    
    // 生成训练动作
    function generateExercises(workoutType, experience, duration) {
        // 这里是简化的训练动作生成逻辑，实际应用中可能需要更复杂的算法和动作数据库
        const exercises = {
            '有氧训练': [
                { name: '跑步', beginner: '20分钟，中等强度', intermediate: '30分钟，中高强度', advanced: '45分钟，高强度间歇' },
                { name: '椭圆机', beginner: '20分钟，低强度', intermediate: '30分钟，中等强度', advanced: '40分钟，高强度间歇' },
                { name: '动感单车', beginner: '15分钟，低强度', intermediate: '25分钟，中等强度', advanced: '40分钟，高强度间歇' },
                { name: '划船机', beginner: '10分钟，低强度', intermediate: '20分钟，中等强度', advanced: '30分钟，高强度间歇' }
            ],
            'HIIT训练': [
                { name: '高抬腿', beginner: '30秒运动，30秒休息', intermediate: '40秒运动，20秒休息', advanced: '45秒运动，15秒休息' },
                { name: '波比跳', beginner: '30秒运动，30秒休息', intermediate: '40秒运动，20秒休息', advanced: '45秒运动，15秒休息' },
                { name: '深蹲跳', beginner: '30秒运动，30秒休息', intermediate: '40秒运动，20秒休息', advanced: '45秒运动，15秒休息' },
                { name: '登山者', beginner: '30秒运动，30秒休息', intermediate: '40秒运动，20秒休息', advanced: '45秒运动，15秒休息' },
                { name: '俯卧撑', beginner: '30秒运动，30秒休息', intermediate: '40秒运动，20秒休息', advanced: '45秒运动，15秒休息' }
            ],
            '全身力量训练': [
                { name: '深蹲', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '俯卧撑', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，15次' },
                { name: '硬拉', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，12次' },
                { name: '划船', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '平板支撑', beginner: '3组，30秒', intermediate: '3组，45秒', advanced: '3组，60秒' }
            ],
            '胸部和三头肌': [
                { name: '卧推', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，12次' },
                { name: '俯卧撑', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，15次' },
                { name: '哑铃飞鸟', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '绳索下压', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '窄距俯卧撑', beginner: '3组，8次', intermediate: '3组，10次', advanced: '4组，12次' }
            ],
            '背部和二头肌': [
                { name: '引体向上', beginner: '3组，5次', intermediate: '4组，8次', advanced: '5组，10次' },
                { name: '划船', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '反向飞鸟', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '哑铃弯举', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '锤式弯举', beginner: '3组，10次', intermediate: '3组，12次', advanced: '4组，15次' }
            ],
            '腿部和肩部': [
                { name: '深蹲', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '硬拉', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，12次' },
                { name: '肩上推举', beginner: '3组，8次', intermediate: '4组，10次', advanced: '4组，12次' },
                { name: '侧平举', beginner: '3组，10次', intermediate: '3组，12次', advanced: '4组，15次' },
                { name: '腿举', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' }
            ],
            '核心训练': [
                { name: '平板支撑', beginner: '3组，30秒', intermediate: '3组，45秒', advanced: '3组，60秒' },
                { name: '仰卧卷腹', beginner: '3组，12次', intermediate: '3组，15次', advanced: '4组，20次' },
                { name: '俄罗斯转体', beginner: '3组，10次/侧', intermediate: '3组，15次/侧', advanced: '4组，20次/侧' },
                { name: '山climbers', beginner: '3组，30秒', intermediate: '3组，45秒', advanced: '3组，60秒' },
                { name: '死虫', beginner: '3组，10次/侧', intermediate: '3组，15次/侧', advanced: '3组，20次/侧' }
            ],
            '灵活性训练': [
                { name: '瑜伽流', beginner: '20分钟，基础姿势', intermediate: '30分钟，中级姿势', advanced: '45分钟，高级姿势' },
                { name: '动态拉伸', beginner: '15分钟，全身', intermediate: '20分钟，全身', advanced: '30分钟，全身' },
                { name: '静态拉伸', beginner: '15分钟，主要肌群', intermediate: '20分钟，全身', advanced: '30分钟，深度拉伸' }
            ],
            '胸部和肩部': [
                { name: '卧推', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，12次' },
                { name: '肩上推举', beginner: '3组，8次', intermediate: '4组，10次', advanced: '4组，12次' },
                { name: '哑铃飞鸟', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '侧平举', beginner: '3组，10次', intermediate: '3组，12次', advanced: '4组，15次' },
                { name: '前平举', beginner: '3组，10次', intermediate: '3组，12次', advanced: '4组，15次' }
            ],
            '背部和手臂': [
                { name: '引体向上', beginner: '3组，5次', intermediate: '4组，8次', advanced: '5组，10次' },
                { name: '划船', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '哑铃弯举', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '绳索下压', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '窄距俯卧撑', beginner: '3组，8次', intermediate: '3组，10次', advanced: '4组，12次' }
            ],
            '腿部': [
                { name: '深蹲', beginner: '3组，10次', intermediate: '4组，12次', advanced: '5组，15次' },
                { name: '硬拉', beginner: '3组，8次', intermediate: '4组，10次', advanced: '5组，12次' },
                { name: '腿举', beginner: '3组，10次', intermediate: '4组，12次', advanced: '4组，15次' },
                { name: '腿弯举', beginner: '3组，10次', intermediate: '3组，12次', advanced: '4组，15次' },
                { name: '小腿提踵', beginner: '3组，15次', intermediate: '4组，15次', advanced: '4组，20次' }
            ]
        };
        
        // 如果没有该类型的训练，返回空数组
        if (!exercises[workoutType]) {
            return [];
        }
        
        // 根据训练时长确定动作数量
        let exerciseCount = 3; // 默认
        if (parseInt(duration) >= 60) {
            exerciseCount = 5;
        } else if (parseInt(duration) >= 45) {
            exerciseCount = 4;
        }
        
        // 随机选择指定数量的动作
        const selectedExercises = [];
        const availableExercises = [...exercises[workoutType]];
        
        for (let i = 0; i < Math.min(exerciseCount, availableExercises.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableExercises.length);
            const exercise = availableExercises.splice(randomIndex, 1)[0];
            
            // 根据经验水平选择适当的训练参数
            let params;
            if (experience === 'beginner') {
                params = exercise.beginner;
            } else if (experience === 'intermediate') {
                params = exercise.intermediate;
            } else {
                params = exercise.advanced;
            }
            
            // 解析参数
            let sets = '3组';
            let reps = '10次';
            let rest = '60秒';
            
            if (params.includes('组')) {
                const match = params.match(/(\d+)组/);
                if (match) sets = match[0];
            }
            
            if (params.includes('次') || params.includes('秒') || params.includes('分钟')) {
                const match = params.match(/(\d+[-\d+]*\s*(?:次|秒|分钟)(?:\/侧)?)/);
                if (match) reps = match[0];
            }
            
            // 添加到选定的动作列表
            selectedExercises.push({
                name: exercise.name,
                sets: sets,
                reps: reps,
                rest: rest,
                notes: params
            });
        }
        
        return selectedExercises;
    }
    
    // 渲染食谱计划
    function renderMealPlan(mealPlan) {
        let html = '';
        
        // 遍历每一天
        for (const day in mealPlan) {
            html += `<div class="day-plan">
                <h4>${day}</h4>`;
            
            // 遍历每一餐
            for (const meal in mealPlan[day]) {
                const mealData = mealPlan[day][meal];
                
                html += `<div class="meal">
                    <h5>${meal}</h5>
                    <p><strong>${mealData.name}</strong> (${mealData.portion})</p>
                    <p>热量: ${mealData.calories} 卡路里 | 蛋白质: ${mealData.protein}g | 碳水: ${mealData.carbs}g | 脂肪: ${mealData.fat}g</p>
                </div>`;
            }
            
            html += `</div>`;
        }
        
        mealPlanContent.innerHTML = html;
    }
    
    // 渲染健身计划
    function renderWorkoutPlan(workoutPlan) {
        let html = '';
        
        // 遍历每一天
        for (const day in workoutPlan) {
            html += `<div class="day-plan">
                <h4>${day} - ${workoutPlan[day].type}</h4>`;
            
            // 遍历每个动作
            workoutPlan[day].exercises.forEach(exercise => {
                html += `<div class="exercise">
                    <p><span class="exercise-name">${exercise.name}</span></p>
                    <p class="exercise-details">组数: ${exercise.sets} | 次数: ${exercise.reps} | 休息: ${exercise.rest}</p>
                    <p class="exercise-details">备注: ${exercise.notes}</p>
                </div>`;
            });
            
            html += `</div>`;
        }
        
        workoutPlanContent.innerHTML = html;
    }
    
    // 下载计划功能
    function downloadPlans() {
        // 创建一个包含计划的文本内容
        let content = `健身计划生成器 - 个性化计划\n\n`;
        content += `用户信息:\n`;
        for (const key in userData) {
            if (key === 'dietaryRestrictions') {
                content += `${key}: ${userData[key].join(', ')}\n`;
            } else {
                content += `${key}: ${userData[key]}\n`;
            }
        }
        
        content += `\n一周食谱计划:\n\n`;
        for (const day in generatedPlans.mealPlan) {
            content += `${day}:\n`;
            for (const meal in generatedPlans.mealPlan[day]) {
                const mealData = generatedPlans.mealPlan[day][meal];
                content += `  ${meal}: ${mealData.name} (${mealData.portion})\n`;
                content += `  热量: ${mealData.calories} 卡路里 | 蛋白质: ${mealData.protein}g | 碳水: ${mealData.carbs}g | 脂肪: ${mealData.fat}g\n`;
            }
            content += `\n`;
        }
        
        content += `一周健身计划:\n\n`;
        for (const day in generatedPlans.workoutPlan) {
            content += `${day} - ${generatedPlans.workoutPlan[day].type}:\n`;
            generatedPlans.workoutPlan[day].exercises.forEach(exercise => {
                content += `  ${exercise.name}\n`;
                content += `  组数: ${exercise.sets} | 次数: ${exercise.reps} | 休息: ${exercise.rest}\n`;
                content += `  备注: ${exercise.notes}\n`;
            });
            content += `\n`;
        }
        
        // 创建一个Blob对象
        const blob = new Blob([content], { type: 'text/plain' });
        
        // 创建一个下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '健身计划.txt';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    
    // 分享计划功能
    function sharePlans() {
        // 简单的分享功能，实际应用中可能需要更复杂的实现
        alert('分享功能正在开发中，敬请期待！');
    }
    
    // 上传用户数据到后台
    function uploadUserData(userData) {
        // 这里是简化的数据上传逻辑，实际应用中需要连接到真实的后端API
        console.log('上传用户数据到后台:', userData);
        
        // 模拟API请求
        const apiUrl = 'https://api.example.com/fitness/user-data';
        
        // 使用fetch API发送数据
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => {
            // 模拟成功响应
            console.log('数据上传成功');
        })
        .catch(error => {
            // 模拟错误处理
            console.error('数据上传失败:', error);
        });
    }
});