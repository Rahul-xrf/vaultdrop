# Deploy Local Storage Version to EC2

## Quick Deployment

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ubuntu@34.229.149.205
   ```

2. **Navigate to your app directory:**
   ```bash
   cd /path/to/your/document-locker-backend
   ```

3. **Stop the current app:**
   ```bash
   # If running in foreground, press Ctrl+C
   # If running in background, find and kill the process:
   ps aux | grep python
   kill <process_id>
   ```

4. **Replace app.py with the local version:**
   ```bash
   # Backup the original
   cp app.py app_s3.py
   
   # Copy the local version
   cp app_local.py app.py
   ```

5. **Install simplified requirements:**
   ```bash
   pip install -r requirements_local.txt
   ```

6. **Start the local version:**
   ```bash
   python app.py
   ```

## Alternative: Create a new directory

1. **Create a new directory for the local version:**
   ```bash
   mkdir ~/document-locker-local
   cd ~/document-locker-local
   ```

2. **Copy the local files:**
   ```bash
   # Copy from your local machine to EC2
   scp -i your-key.pem app_local.py ubuntu@34.229.149.205:~/document-locker-local/app.py
   scp -i your-key.pem requirements_local.txt ubuntu@34.229.149.205:~/document-locker-local/
   ```

3. **Install and run:**
   ```bash
   pip install -r requirements_local.txt
   python app.py
   ```

## Using systemd for Production

1. **Create a systemd service file:**
   ```bash
   sudo nano /etc/systemd/system/document-locker.service
   ```

2. **Add the service configuration:**
   ```ini
   [Unit]
   Description=Document Locker Backend
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/document-locker-local
   ExecStart=/usr/bin/python3 app.py
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable document-locker
   sudo systemctl start document-locker
   sudo systemctl status document-locker
   ```

## Testing

1. **Check if the app is running:**
   ```bash
   curl http://34.229.149.205:5000/
   ```

2. **Test file upload** through the web interface

## Benefits of Local Storage Version

- ✅ No AWS S3 required
- ✅ Files stored locally on EC2
- ✅ Same API endpoints
- ✅ Faster upload/download
- ✅ No cloud storage costs
- ✅ Simpler setup

## File Storage Location

Files will be stored in:
- `/home/ubuntu/document-locker-local/uploads/` (if using new directory)
- `/path/to/your/app/uploads/` (if replacing existing app.py)

Metadata is stored in `file_metadata.json` in the same directory. 