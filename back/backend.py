from flask import Flask, jsonify, request, send_from_directory
import json
import os

app = Flask(__name__, static_folder=".", static_url_path="")

DATA_FILE = 'todo_data.json'

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/data')
def get_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/save', methods=['POST'])
def save_data():
    new_data = request.get_json()
    for link in new_data['links']:
        if isinstance(link['source'], dict):
            link['source'] = link['source']['id']
        if isinstance(link['target'], dict):
            link['target'] = link['target']['id']
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "saved"})

@app.route('/update-task', methods=['POST'])
def update_task():
    data = request.get_json()
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
        return jsonify({"status": "updated"})
    else:
        return jsonify({"status": "not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)

