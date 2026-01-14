# LINE Sweet Home

[![AI Engine](https://img.shields.io/badge/AI-Groq--Llama3.3-orange)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Live-green)](https://line-fresh-2025.onrender.com/)

> **LINE FRESH 2025 參賽作品**：利用真 AI 技術縮小長晚輩間數位鴻溝，找尋幸福感解方。
## The Team " YAYA爺爺 " - BY YC CHEN,TY HUANG,ALAN SHAO,LINDA KUO 

## 核心理念
許多長輩不習慣輸入文字，偏好語音留言，但晚輩常因開會或忙碌無法即時聽取。LINE Sweet Home 透過最新的語音模型，將長輩的語音即時轉化為情緒摘要與行動重點，讓關懷不再漏接。

## 技術亮點
- **即時語音辨識 (STT)**：採用 OpenAI Whisper-large-v3 模型，精準辨識中文與台語口音。
- **語意與情緒分析**：利用 Llama-3.3-70b 模型進行內容摘要，並感知長輩心情（如：寂寞、開心、身體不適）。
- **極速推理**：透過 Groq LPU 加速器，達成近乎零延遲的 AI 處理速度。
- **雙端同步**：長輩端一鍵圓形大按鈕設計，晚輩端 LINE 風格摘要介面。

## 開發技術
- **Frontend**: HTML5, CSS3 (Flexbox/Animations), Vanilla JS
- **Backend**: Node.js, Express
- **AI Engine**: Groq SDK (Whisper & Llama 3.3)
- **Database**: JSON-based local DB (for demo purposes)

## 本地開發
1. 複製專案: `git clone https://github.com/ycchenn/LINE-FRESH-2025.git`
2. 安裝套件: `npm install`
3. 設定環境變數: 建立 `.env` 並加入 GROQ API KEY
4. 啟動伺服器: `node server.js`