# 8月5日大更新：加入UI界面
## 加入子项目UI：可视化研究界面
## 使用方法
  - cd ui
  - npm install
  - cp .env.example .env
  - 编辑.env，设置自己的Gemini APIKEY(可在Google AI Studio中申请)
  - 设置模型，默认使用'gemini-2.5-flash'，在当前场景下，2.5-pro模型不能正常使用，可选项是2.5-flash和2.5-flash-lite
  - npm run dev
  - 访问 localhost:5173

# 终端下的一键式研究（目前，它还是质量更好的方式，可使用2.5-pro，在任务迭代上质量略高，同时目前工作流支持一键生成可视化报告）
## 安装Gemini CLI ：Mac or Linux （Windows需要使用WSL子系统）
1. 安装Node：https://nodejs.org/en/download 安装Node.js， 需要20及以上版本
2. 在命令行下安装
     npx https://github.com/google-gemini/gemini-cli
   或者
     npm install -g @google/gemini-cli
3. 运行 Gemini CLI
     gemini

4. 进行深度研究，在Gemini CLI客户端里输入：
     do a deep reserch under the instruction prompted at @instruct.md: 【提示词，中英文均可】
   例如： 
     do a deep reserch under the instruction prompted at @instruct.md: impacts of us-euro's 15% tariff agreement: for each country, each sector, and long-term impacts and shifts

## examples/
  将日常研究结果加入，作为分享。

# 历史更新

## 2025-7-31日更新：
  加入instruct_v2.md，修改了机制，可以生成更长的报告内容，但是稳定性会差一些。

## 2025-7-29更新：
  加入日报生成功能: daily/
  提示词：follow the instruct of @report.md to finish the report and webpage gen task



# 未解决的bug：
  在Gemini Cli中，如果使用flash模型，需要输入提示词两次：第一次程序读取了指定的文件，然后“自认为”任务完成了，需要再输入一次相同的提示词才可以继续进行工作。


# 初衷，如果您会看到这里的话
  自从Deep Research问世后，冠以“OpenResearch”的复刻项目琳琅满目，那么我为什么还要写这个名字？其实原因很简单：
  1. 技术应该是越来越简单，我想尽可能用简单的方式来实现一些复杂的输出，特别是在这个AI时代；
  2. Research没什么好神秘的，在这个时代，任何人应该都可以利用公开信息和合适的工具实现99%的“研究”需求；
  综上，这是我理解的“Open”。