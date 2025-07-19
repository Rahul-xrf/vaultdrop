#!/bin/bash

# Deploy Local Storage Version to EC2
# Usage: ./deploy_to_ec2.sh <key_file.pem> <ec2_ip>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <key_file.pem> <ec2_ip>"
    echo "Example: $0 my-key.pem 34.229.149.205"
    exit 1
fi

KEY_FILE=$1
EC2_IP=$2
REMOTE_USER="ubuntu"
REMOTE_DIR="~/document-locker-local"

echo "🚀 Deploying Document Locker (Local Storage) to EC2..."
echo "EC2 IP: $EC2_IP"
echo "Key file: $KEY_FILE"
echo ""

# Test SSH connection
echo "Testing SSH connection..."
ssh -i "$KEY_FILE" -o ConnectTimeout=10 "$REMOTE_USER@$EC2_IP" "echo 'SSH connection successful'" || {
    echo "❌ Failed to connect to EC2 instance"
    exit 1
}

echo "✅ SSH connection successful"
echo ""

# Create remote directory
echo "Creating remote directory..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# Copy files
echo "Copying files to EC2..."
scp -i "$KEY_FILE" app_local.py "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/app.py"
scp -i "$KEY_FILE" requirements_local.txt "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/"

# Install dependencies and start
echo "Installing dependencies and starting the app..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" "cd $REMOTE_DIR && pip install -r requirements_local.txt"

# Kill any existing Python processes
echo "Stopping any existing Flask apps..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" "pkill -f 'python.*app.py' || true"

# Start the app in background
echo "Starting the app..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$EC2_IP" "cd $REMOTE_DIR && nohup python app.py > app.log 2>&1 &"

# Wait a moment for the app to start
sleep 3

# Test the app
echo "Testing the app..."
curl -s "http://$EC2_IP:5000/" | grep -q "Document Locker API" && {
    echo "✅ App is running successfully!"
    echo "🌐 Access your app at: http://$EC2_IP:5000"
    echo "📁 Files will be stored in: $REMOTE_DIR/uploads/"
} || {
    echo "❌ App might not be running properly"
    echo "Check the logs: ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'cd $REMOTE_DIR && tail -f app.log'"
}

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "To check the app status:"
echo "ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'cd $REMOTE_DIR && ps aux | grep python'"
echo ""
echo "To view logs:"
echo "ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'cd $REMOTE_DIR && tail -f app.log'"
echo ""
echo "To stop the app:"
echo "ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'pkill -f \"python.*app.py\"'" 