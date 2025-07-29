# 安装Gemini CLI ：Mac or Linux （Windows需要使用WSL子系统）
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

# 2025-7-29更新：
  加入日报生成功能: daily/
  提示词：follow the instruct of @report.md to finish the report and webpage gen task

# 未解决的bug：
  在Gemini Cli中，如果使用flash模型，需要输入提示词两次：第一次程序读取了指定的文件，然后“自认为”任务完成了，需要再输入一次相同的提示词才可以继续进行工作。