# 📦 VaultDrop - Secure Online Document Locker

VaultDrop is a secure, cloud-based document management platform that allows users to upload, access, and manage personal documents from anywhere. Built with a DevOps-first mindset, VaultDrop uses AWS S3 for secure storage and automates infrastructure provisioning and configuration with Terraform and Ansible.

---

## 🚀 Key Features

* 🔐 Secure upload/download of personal documents
* ☁️ AWS S3-backed private file storage
* 🌐 Accessible globally via EC2 public IP
* 🖥️ Minimal, mobile-ready UI (HTML/CSS/JS)
* 🛠️ Python Flask backend with REST APIs
* 🔁 Continuous infrastructure management with Terraform
* 🤖 Automated server provisioning using Ansible

---

## 🧱 Project Architecture

```
[Frontend: HTML/CSS/JS] ←→ [Flask Backend API] ←→ [AWS S3 (Private)]
                                        ↑
                              [EC2 Instance: Ubuntu Server]
                                        ↑
                 [Provisioned by Terraform + Configured by Ansible]
```

---

## 💡 Tech Stack Overview

| Layer         | Tools/Services                  |
| ------------- | ------------------------------- |
| Frontend      | HTML, CSS, JavaScript           |
| Backend       | Flask (Python), Boto3           |
| Cloud Storage | AWS S3 (Versioned, Private)     |
| Infra Setup   | Terraform (EC2, IAM, S3)        |
| Server Config | Ansible (Docker, Python, Flask) |

---

## 🛠️ Local & Cloud Setup

### 🔧 1. Frontend Setup

```bash
cd document-locker-frontend
# Open index.html in browser
```

### 🚀 2. Run Backend Locally

```bash
cd document-locker-backend
pip install -r requirements.txt
python app.py  # Runs on http://localhost:5000
```

### ☁️ 3. Deploy Infrastructure with Terraform

```bash
cd terraform
terraform init
terraform apply  # Creates EC2, IAM roles, and S3 bucket
```

### 🤖 4. Configure EC2 Instance via Ansible

```bash
cd ansible
ansible-playbook -i inventory.ini playbook.yml
```

---

## 🌍 Global Access

* Once deployed, the backend is accessible via EC2 public IP at `http://<public-ip>:5000`
* Ensure port 5000 is open in security group for global access

---

## 📸 Screenshots (To Be Added)

* Upload success
* File list preview
* S3 console showing uploaded files

---

## 🔐 Security Best Practices

* No public access to S3 bucket
* IAM policies grant least-privilege access
* Environment secrets stored outside GitHub
* `.gitignore` blocks `.env`, credentials, and cache files

---

## 🧪 Future Enhancements

* JWT-based user authentication system
* File encryption before upload
* File/folder renaming & trash management
* Drag-and-drop file upload area
* Email alerts for file activity (optional)

---

## 🙌 Acknowledgments

VaultDrop is built as a complete DevOps-enabled cloud application to demonstrate real-world skills in infrastructure automation, cloud integration, and web development.

## 👤 Author

**Rahul XRF**
GitHub: [@Rahul-xrf](https://github.com/Rahul-xrf)

# vaultdrop
VaultDrop is a secure cloud-based online document locker that allows users to upload, manage, and download files safely. It's a mini DigiLocker-style platform, but fully custom-built with cloud + DevOps principles.
