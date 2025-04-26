from fastapi import FastAPI
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import os

app = FastAPI()

# مسیر فایل داده‌ها
DATA_FILE = 'todo_data.json'

# بررسی وجود فایل و ایجاد آن در صورت عدم وجود
if not os.path.exists(DATA_FILE):
    default_data = {
        "tasks": [],
        "links": []
    }
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(default_data, f, ensure_ascii=False, indent=2)

# سرو کردن فایل‌های استاتیک
app.mount("/static", StaticFiles(directory="static"), name="static")

# ارسال فایل HTML به صورت مستقیم
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.get("/data")
async def get_data():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/save")
async def save_data(new_data: dict):
    try:
        # تغییر آیدی‌ها به فرمت صحیح
        for link in new_data['links']:
            if isinstance(link['source'], dict):
                link['source'] = link['source']['id']
            if isinstance(link['target'], dict):
                link['target'] = link['target']['id']

        # ذخیره داده‌ها در فایل
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        return JSONResponse(content={"status": "saved"})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/update-task")
async def update_task(data: dict):
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = json.load(f)

        updated = False
        for task in content['tasks']:
            if task['id'] == data['original_id']:
                task['id'] = data['new_id']
                task['title'] = data['title']
                task['description'] = data.get('description', '')
                updated = True

        for link in content['links']:
            if link['source'] == data['original_id']:
                link['source'] = data['new_id']
            if link['target'] == data['original_id']:
                link['target'] = data['new_id']

        if updated:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)
            return JSONResponse(content={"status": "updated"})
        else:
            return JSONResponse(content={"status": "not found"}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# اجرای سرور در صورت اجرا به صورت مستقل
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

