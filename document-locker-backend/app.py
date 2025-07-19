import os
print("Current working directory:", os.getcwd())
from dotenv import load_dotenv
load_dotenv()


from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from werkzeug.utils import secure_filename
from io import BytesIO
from datetime import datetime
from functools import wraps

app = Flask(__name__, static_folder='frontend')
CORS(app)

# AWS S3 Config
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = "s3-test-bucket-rahul-xrf-0716"

# Initialize S3 client only if credentials are available
s3 = None
if AWS_ACCESS_KEY and AWS_SECRET_KEY:
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name="us-east-1"
        )
    except Exception as e:
        print(f"Failed to initialize S3 client: {e}")
        s3 = None
else:
    print("AWS credentials not found. S3 functionality will be disabled.")

def get_file_metadata(filename):
    if not s3:
        return None
    try:
        response = s3.head_object(Bucket=BUCKET_NAME, Key=filename)
        return {
            'last_modified': response['LastModified'].isoformat(),
            'size': response['ContentLength'],
            'content_type': response['ContentType']
        }
    except ClientError:
        return None

def get_s3_metadata(key):
    if not s3:
        return {}, None
    try:
        response = s3.head_object(Bucket=BUCKET_NAME, Key=key)
        meta = response.get('Metadata', {})
        return meta, response
    except Exception:
        return {}, None

def set_s3_metadata(key, new_metadata):
    if not s3:
        return False
    copy_source = {'Bucket': BUCKET_NAME, 'Key': key}
    meta, response = get_s3_metadata(key)
    if not response:
        return False
    meta.update(new_metadata)
    s3.copy_object(
        Bucket=BUCKET_NAME,
        CopySource=copy_source,
        Key=key,
        Metadata=meta,
        MetadataDirective='REPLACE',
        ContentType=response['ContentType'],
        ACL='private'
    )
    return True

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    # Allow any email and password for demo purposes
    if data.get('email') and data.get('password'):
        return jsonify({"token": "sample-token"}), 200
    return jsonify({"message": "Invalid credentials"}), 401

# Remove any duplicate or conflicting '/' route that returns JSON
# Only keep the static file serving route for '/'
@app.route('/')
def serve_index():
    return send_from_directory('/opt/document-locker/frontend', 'index.html')

@app.route('/<path:path>')
def serve_static_file(path):
    return send_from_directory('/opt/document-locker/frontend', path)

@app.route('/status')
def status():
    return jsonify({"message": "Document Locker API is running"})


@app.route('/upload', methods=['POST'])
def upload_file():
    if not s3:
        return jsonify({"error": "S3 service not available. Please configure AWS credentials."}), 503
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files['file']
    if file.filename == '' or file.filename is None:
        return jsonify({"error": "Empty file"}), 400
    filename = secure_filename(file.filename)
    folder = request.form.get('folder', '')
    pin = request.form.get('pin', '')
    owner_email = request.form.get('owner_email', '')
    owner_name = request.form.get('owner_name', '')
    key = f"{folder}/{filename}" if folder else filename
    # Check if file already exists
    _, exists = get_s3_metadata(key)
    if exists:
        return jsonify({"error": "File already exists"}), 400
    try:
        s3.upload_fileobj(
            file, 
            BUCKET_NAME, 
            key,
            ExtraArgs={
                'ACL': 'private',
                'ContentType': file.content_type,
                'Metadata': {
                    'folder': folder,
                    'is_trashed': 'false',
                    'pin': pin,
                    'owner_email': owner_email,
                    'owner_name': owner_name
                }
            }
        )
        meta, response = get_s3_metadata(key)
        return jsonify({
            "message": f"{key} uploaded to S3",
            "metadata": meta
        }), 200
    except NoCredentialsError:
        return jsonify({"error": "AWS credentials error"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/files', methods=['GET'])
def list_files():
    if not s3:
        return jsonify({"files": [], "message": "S3 service not available. Please configure AWS credentials."}), 200
    folder = request.args.get('folder', '')
    trashed = request.args.get('trashed', 'false')
    try:
        objects = s3.list_objects_v2(Bucket=BUCKET_NAME)
        files = []
        if 'Contents' in objects:
            for obj in objects['Contents']:
                key = obj['Key']
                meta, response = get_s3_metadata(key)
                if not isinstance(meta, dict):
                    meta = {}
                if meta.get('is_trashed', 'false') != trashed:
                    continue
                if folder and meta.get('folder', '') != folder:
                    continue
                # Get content_type from S3 object metadata
                content_type = None
                if response and 'ContentType' in response:
                    content_type = response['ContentType']
                files.append({
                    'name': key.split('/')[-1],
                    'key': key,
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'type': 'file',
                    'folder': meta.get('folder', ''),
                    'is_trashed': meta.get('is_trashed', 'false'),
                    'owner_email': meta.get('owner_email', ''),
                    'owner_name': meta.get('owner_name', ''),
                    'pin': bool(meta.get('pin')),
                    'content_type': content_type
                })
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    if not s3:
        return jsonify({"error": "S3 service not available. Please configure AWS credentials."}), 503
    try:
        metadata = get_file_metadata(filename)
        if not metadata:
            return jsonify({"error": "File not found"}), 404
        file_obj = BytesIO()
        s3.download_fileobj(BUCKET_NAME, filename, file_obj)
        file_obj.seek(0)
        return send_file(
            file_obj,
            download_name=filename,
            as_attachment=True,
            mimetype=metadata['content_type']
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    if not s3:
        return jsonify({"error": "S3 service not available. Please configure AWS credentials."}), 503
    meta, exists = get_s3_metadata(filename)
    if not exists:
        return jsonify({"error": "File not found"}), 404
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key=filename)
        return jsonify({"message": f"{filename} deleted from S3"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/trash', methods=['GET'])
def list_trash():
    # This route is no longer relevant as files are not trashed in S3
    return jsonify({"files": [], "message": "Trash functionality is not available in this local demo."}), 200

@app.route('/restore/<path:filename>', methods=['POST'])
def restore_file(filename):
    # This route is no longer relevant as files are not trashed in S3
    return jsonify({"message": f"{filename} restore functionality is not available in this local demo."}), 200

@app.route('/permanent-delete/<path:filename>', methods=['DELETE'])
def permanent_delete_file(filename):
    # This route is no longer relevant as files are not trashed in S3
    return jsonify({"message": f"{filename} permanent delete functionality is not available in this local demo."}), 200

@app.route('/lock/<path:filename>', methods=['POST'])
def lock_file(filename):
    pin = None
    if request.is_json and request.json is not None:
        pin = request.json.get('pin')
    if not pin or len(pin) not in [4, 6] or not pin.isdigit():
        return jsonify({'error': 'PIN must be 4 or 6 digits'}), 400
    # This route is no longer relevant as files are not trashed in S3
    return jsonify({'message': f'{filename} lock functionality is not available in this local demo.'}), 200

@app.route('/unlock/<path:filename>', methods=['POST'])
def unlock_file(filename):
    pin = None
    if request.is_json and request.json is not None:
        pin = request.json.get('pin')
    # This route is no longer relevant as files are not trashed in S3
    return jsonify({'message': 'PIN correct functionality is not available in this local demo.'}), 200

@app.route('/storage', methods=['GET'])
def get_storage_usage():
    if not s3:
        return jsonify({
            "total_bytes": 0,
            "unit": "Bytes",
            "file_count": 0,
            "message": "S3 service not available. Please configure AWS credentials."
        }), 200
    try:
        objects = s3.list_objects_v2(Bucket=BUCKET_NAME)
        total_bytes = sum(obj['Size'] for obj in objects.get('Contents', []))
        return jsonify({"total_bytes": total_bytes})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/me', methods=['GET'])
def get_user_info():
    # In real app, get from auth/session
    email = request.args.get('email', 'test@test.com')
    name = request.args.get('name', 'Test User')
    return jsonify({'email': email, 'name': name})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)