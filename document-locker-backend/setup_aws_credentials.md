# Setting up AWS S3 Credentials on EC2

## Method 1: Using AWS CLI (Recommended)

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ubuntu@34.229.149.205
   ```

2. **Install AWS CLI:**
   ```bash
   sudo apt update
   sudo apt install awscli -y
   ```

3. **Configure AWS credentials:**
   ```bash
   aws configure
   ```
   
   Enter your AWS credentials when prompted:
   - AWS Access Key ID: [your_access_key]
   - AWS Secret Access Key: [your_secret_key]
   - Default region name: us-east-1
   - Default output format: json

4. **Create a .env file:**
   ```bash
   cd /path/to/your/app
   nano .env
   ```
   
   Add your credentials:
   ```
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

5. **Restart your Flask app:**
   ```bash
   # Stop the current app (Ctrl+C if running in foreground)
   # Then restart it
   python app.py
   ```

## Method 2: Environment Variables

1. **SSH into your EC2 instance**

2. **Set environment variables:**
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key_here
   export AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

3. **Start the app with environment variables:**
   ```bash
   AWS_ACCESS_KEY_ID=your_access_key_here AWS_SECRET_ACCESS_KEY=your_secret_key_here python app.py
   ```

## Method 3: IAM Role (Best for Production)

1. **Create an IAM Role** in AWS Console with S3 permissions
2. **Attach the role** to your EC2 instance
3. **No credentials needed** - AWS will automatically provide them

## Testing the Setup

1. **Check if S3 is working:**
   ```bash
   curl http://34.229.149.205:5000/
   ```

2. **Test file upload** through the web interface

## Troubleshooting

- **Check if credentials are loaded:**
  ```bash
  echo $AWS_ACCESS_KEY_ID
  echo $AWS_SECRET_ACCESS_KEY
  ```

- **Test S3 connection:**
  ```bash
  aws s3 ls s3://s3-test-bucket-rahul-xrf-0716
  ```

- **Check Flask app logs** for S3 connection errors 