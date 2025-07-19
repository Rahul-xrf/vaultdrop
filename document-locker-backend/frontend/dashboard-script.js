// Enhanced Dashboard functionality with Flask Backend Integration
class Dashboard {
    constructor() {
        
        this.selectedFiles = new Set();
        this.currentPath = [];
        this.currentView = 'grid';
        this.searchQuery = '';
        this.files = [];
        this.folders = new Map(); // Store folder contents
        this.apiBaseUrl = 'http://34.229.149.205:5000';
        this.init();
    }

    init() {
        console.log('Dashboard initializing...');
        this.setupEventListeners();
        this.setupSearch();
        this.setupFileSelection();
        this.setupResponsiveMenu();
        this.setupDragAndDrop();
        this.loadUserData();
        this.loadFilesFromServer(); // Load files from backend
        this.updateStorageUsage();
        console.log('Dashboard initialized successfully');
    }

    setupEventListeners() {
        // Upload Files button
        const uploadBtn = document.querySelector('.btn-primary');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', this.handleUpload.bind(this));
        }

        // New Folder button
        const newFolderBtn = document.querySelector('.btn-secondary');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', this.handleNewFolder.bind(this));
        }

        // Action buttons
        const shareBtn = document.querySelector('.action-btn:nth-child(1)');
        const renameBtn = document.querySelector('.action-btn:nth-child(2)');
        const deleteBtn = document.querySelector('.action-btn.delete');

        if (shareBtn) shareBtn.addEventListener('click', this.handleShare.bind(this));
        if (renameBtn) renameBtn.addEventListener('click', this.handleRename.bind(this));
        if (deleteBtn) deleteBtn.addEventListener('click', this.handleDelete.bind(this));

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Back button
        const backBtn = document.getElementById('backButton');
        if (backBtn) {
            backBtn.addEventListener('click', this.navigateBack.bind(this));
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.accept = 'image/*,application/pdf,.doc,.docx,.txt';
        fileInput.addEventListener('change', this.handleFileInputChange.bind(this));
        document.body.appendChild(fileInput);
        this.fileInput = fileInput;
    }

    // Load files from Flask backend
    async loadFilesFromServer() {
        try {
            console.log('Loading files from server...');
            this.showLoadingState();
            const response = await fetch(`${this.apiBaseUrl}/files`);
            console.log('Files response:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Files data:', data);
            
            // Use backend file object format
            this.files = data.files.map(file => {
                const isImage = file.content_type && file.content_type.startsWith('image/');
                return {
                    id: this.generateFileId(),
                    name: file.name,
                    type: 'file',
                    dateModified: file.last_modified ? new Date(file.last_modified) : new Date(),
                    size: file.size || null,
                    serverFilename: file.key || file.name,
                    mimeType: file.content_type || null,
                    thumbnail: isImage ? `${this.apiBaseUrl}/download/${encodeURIComponent(file.key || file.name)}` : null
                };
            });
            
            this.renderFiles();
            this.hideLoadingState();
            this.showNotification(`Loaded ${this.files.length} files from server`, 'success');
            
        } catch (error) {
            console.error('Error loading files:', error);
            this.hideLoadingState();
            this.showNotification('Failed to load files from server. Working in offline mode.', 'warning');
            // Initialize with empty array for offline mode
            this.files = [];
            this.renderFiles();
        }
    }

    // Upload files to Flask backend
    async uploadFilesToServer(files) {
        const uploadPromises = Array.from(files).map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.status}`);
                }
                
                const result = await response.json();
                
                // Add file to local state
                const newFile = {
                    id: this.generateFileId(),
                    name: file.name,
                    type: 'file',
                    size: file.size,
                    mimeType: file.type,
                    dateModified: new Date(),
                    serverFilename: file.name,
                    thumbnail: file.type.startsWith('image/') ? await this.createThumbnail(file) : null
                };
                
                this.files.push(newFile);
                return { success: true, file: newFile, message: result.message };
                
            } catch (error) {
                console.error('Upload error:', error);
                return { success: false, filename: file.name, error: error.message };
            }
        });
        
        const results = await Promise.all(uploadPromises);
        return results;
    }

    // Delete file from Flask backend
    async deleteFileFromServer(filename) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/delete/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }
            
            const result = await response.json();
            return { success: true, message: result.message };
            
        } catch (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }
    }

    // Download file from Flask backend
    async downloadFileFromServer(filename) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`);
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            return { success: true };
            
        } catch (error) {
            console.error('Download error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get storage usage from Flask backend
    async updateStorageUsageFromServer() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/storage`);
            
            if (!response.ok) {
                throw new Error(`Storage info failed: ${response.status}`);
            }
            
            const data = await response.json();
            const totalBytes = data.total_bytes;
            const maxBytes = 15 * 1024 * 1024 * 1024; // 15 GB limit
            const usedGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);
            const usedPercent = ((totalBytes / maxBytes) * 100).toFixed(1);

            const storageUsage = document.querySelector('.storage-usage');
            const storageProgress = document.querySelector('.storage-progress');
            
            if (storageUsage) {
                storageUsage.textContent = `${usedGB} GB of 15 GB used`;
            }
            
            if (storageProgress) {
                storageProgress.style.width = `${Math.min(usedPercent, 100)}%`;
            }
            
        } catch (error) {
            console.error('Error getting storage info:', error);
            // Fallback to local calculation
            this.updateStorageUsage();
        }
    }

    setupDragAndDrop() {
        const fileGrid = document.querySelector('.file-grid');
        if (!fileGrid) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileGrid.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            fileGrid.addEventListener(eventName, this.highlight.bind(this), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileGrid.addEventListener(eventName, this.unhighlight.bind(this), false);
        });

        // Handle dropped files
        fileGrid.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(e) {
        const fileGrid = document.querySelector('.file-grid');
        if (fileGrid) {
            fileGrid.classList.add('dragover');
        }
    }

    unhighlight(e) {
        const fileGrid = document.querySelector('.file-grid');
        if (fileGrid) {
            fileGrid.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');

        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', this.performSearch.bind(this));
        }
    }

    setupFileSelection() {
        this.attachFileEventListeners();
    }

    attachFileEventListeners() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            item.replaceWith(item.cloneNode(true));
        });

        const newFileItems = document.querySelectorAll('.file-item');
        newFileItems.forEach(item => {
            item.addEventListener('click', this.handleFileClick.bind(this));
            item.addEventListener('dblclick', this.handleFileDoubleClick.bind(this));
        });
    }

    setupResponsiveMenu() {
        if (window.innerWidth <= 768) {
            this.createMobileMenuToggle();
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-toggle')) {
                this.createMobileMenuToggle();
            } else if (window.innerWidth > 768) {
                const toggle = document.querySelector('.mobile-menu-toggle');
                if (toggle) toggle.remove();
            }
        });
    }

    createMobileMenuToggle() {
        const header = document.querySelector('.header');
        const toggle = document.createElement('button');
        toggle.className = 'mobile-menu-toggle';
        toggle.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;
        
        toggle.style.cssText = `
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s ease;
            margin-right: 1rem;
        `;

        toggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        header.insertBefore(toggle, header.firstChild);
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('open');
    }

    loadUserData() {
        const userData = {
            name: 'Test User',
            email: 'test@test.com',
            avatar: '836.jpg'
        };

        this.updateUserProfile(userData);
    }

    updateUserProfile(userData) {
        const userName = document.querySelector('.user-name');
        const userEmail = document.querySelector('.user-email');
        const userAvatar = document.querySelector('.user-avatar img');

        if (userName) userName.textContent = userData.name;
        if (userEmail) userEmail.textContent = userData.email;
        if (userAvatar) userAvatar.src = userData.avatar;
    }

    handleUpload() {
        this.fileInput.click();
    }

    handleFileInputChange(e) {
        const files = e.target.files;
        this.handleFiles(files);
        e.target.value = '';
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;

        this.showNotification(`Uploading ${files.length} file(s)...`, 'info');
        this.showLoadingState();

        try {
            const results = await this.uploadFilesToServer(files);
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            if (successful.length > 0) {
                this.renderFiles();
                this.updateStorageUsageFromServer();
                this.showNotification(`Successfully uploaded ${successful.length} file(s)`, 'success');
            }
            
            if (failed.length > 0) {
                this.showNotification(`Failed to upload ${failed.length} file(s)`, 'error');
                console.error('Upload failures:', failed);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    handleNewFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            this.createFolder(folderName.trim());
        }
    }

    createFolder(name) {
        const newFolder = {
            id: this.generateFileId(),
            name: name,
            type: 'folder',
            dateModified: new Date(),
            size: 0
        };
        
        this.files.push(newFolder);
        this.folders.set(name, []); // Initialize empty folder contents
        this.renderFiles();
        this.showNotification(`Created folder: ${name}`, 'success');
    }

    handleShare() {
        if (this.selectedFiles.size === 0) {
            this.showNotification('Please select files to share', 'warning');
            return;
        }
        
        this.showNotification(`Sharing ${this.selectedFiles.size} item(s)`, 'info');
    }

    handleRename() {
        if (this.selectedFiles.size !== 1) {
            this.showNotification('Please select exactly one item to rename', 'warning');
            return;
        }
        
        const fileId = Array.from(this.selectedFiles)[0];
        const file = this.files.find(f => f.id === fileId);
        
        if (file) {
            const newName = prompt('Enter new name:', file.name);
            if (newName && newName.trim() && newName !== file.name) {
                file.name = newName.trim();
                this.renderFiles();
                this.showNotification(`Renamed to: ${newName}`, 'success');
            }
        }
    }

    async handleDelete() {
        if (this.selectedFiles.size === 0) {
            this.showNotification('Please select items to delete', 'warning');
            return;
        }

        const confirmed = await showConfirmDialog(`Are you sure you want to delete ${this.selectedFiles.size} item(s)?`, 'Delete', 'Cancel');
        if (!confirmed) return;

        const filesToDelete = Array.from(this.selectedFiles);
        this.showLoadingState();
        try {
            const deletePromises = filesToDelete.map(async (fileId) => {
                const file = this.files.find(f => f.id === fileId);
                if (file && file.serverFilename) {
                    return await this.deleteFileFromServer(file.serverFilename);
                }
                return { success: true }; // For local folders
            });
            const results = await Promise.all(deletePromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            if (successful.length > 0) {
                this.files = this.files.filter(file => !filesToDelete.includes(file.id));
                this.selectedFiles.clear();
                this.renderFiles();
                this.updateStorageUsageFromServer();
                this.showNotification(`Deleted ${successful.length} item(s)`, 'success');
            }
            if (failed.length > 0) {
                this.showNotification(`Failed to delete ${failed.length} item(s)`, 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.showNotification('Logging out...', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    handleNavigation(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const text = link.querySelector('span').textContent;
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        link.closest('.nav-item').classList.add('active');
        
        // Handle folder navigation
        if (text === 'All Files') {
            this.navigateToRoot();
        } else if (text === 'Back') {
            this.navigateBack();
        } else {
            // Check if it's a folder
            const folder = this.files.find(f => f.name === text && f.type === 'folder');
            if (folder) {
                this.openFolder(folder);
            }
        }
        
        this.showNotification(`Navigated to ${text}`, 'info');
    }

    navigateToRoot() {
        this.currentPath = [];
        this.updateBreadcrumb();
        this.loadFilesFromServer();
    }

    navigateBack() {
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.updateBreadcrumb();
            this.loadFilesFromServer();
        }
    }

    openFolder(folder) {
        this.currentPath.push(folder.name);
        this.updateBreadcrumb();
        this.loadFolderContents(folder.name);
    }

    updateBreadcrumb() {
        const breadcrumbNav = document.querySelector('.breadcrumb-nav');
        const backBtn = document.getElementById('backButton');
        
        // Show/hide back button
        if (backBtn) {
            backBtn.style.display = this.currentPath.length > 0 ? 'flex' : 'none';
        }
        
        if (breadcrumbNav) {
            let breadcrumbHTML = '<a href="#" class="breadcrumb-link" data-action="root">Home</a>';
            
            this.currentPath.forEach((path, index) => {
                breadcrumbHTML += `
                    <span class="breadcrumb-separator">/</span>
                    <a href="#" class="breadcrumb-link" data-path="${index}">${this.escapeHtml(path)}</a>
                `;
            });
            
            breadcrumbNav.innerHTML = breadcrumbHTML;
            
            // Add event listeners to breadcrumb links
            breadcrumbNav.querySelectorAll('.breadcrumb-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = link.getAttribute('data-action');
                    const pathIndex = link.getAttribute('data-path');
                    
                    if (action === 'root') {
                        this.navigateToRoot();
                    } else if (pathIndex !== null) {
                        const index = parseInt(pathIndex);
                        this.currentPath = this.currentPath.slice(0, index + 1);
                        this.updateBreadcrumb();
                        this.loadFilesFromServer();
                    }
                });
            });
        }
    }

    async loadFolderContents(folderName) {
        try {
            this.showLoadingState();
            
            // For now, we'll simulate folder contents
            // In a real implementation, you'd fetch from the backend
            const folderContents = this.folders.get(folderName) || [];
            
            this.files = folderContents;
            this.renderFiles();
            this.hideLoadingState();
            
            this.showNotification(`Opened folder: ${folderName}`, 'success');
            
        } catch (error) {
            console.error('Error loading folder contents:', error);
            this.hideLoadingState();
            this.showNotification('Failed to load folder contents', 'error');
        }
    }

    handleSearchInput(e) {
        this.searchQuery = e.target.value;
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderFiles();
        }, 300);
    }

    performSearch() {
        this.renderFiles();
        if (this.searchQuery.trim()) {
            this.showNotification(`Searching for: ${this.searchQuery}`, 'info');
        }
    }

    handleFileClick(e) {
        const fileItem = e.currentTarget;
        const fileId = fileItem.dataset.fileId;
        
        if (!fileId) return;
        
        if (e.ctrlKey || e.metaKey) {
            this.toggleFileSelection(fileId);
        } else {
            this.selectSingleFile(fileId);
        }
        
        this.updateFileSelection();
        this.updateRightPanel();
    }

    handleFileDoubleClick(e) {
        const fileItem = e.currentTarget;
        const fileId = fileItem.dataset.fileId;
        const file = this.files.find(f => f.id === fileId);

        if (!file) return;

        if (file.type === 'folder') {
            this.openFolder(file);
        } else {
            this.previewFile(file);
        }
    }

    toggleFileSelection(fileId) {
        if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
        } else {
            this.selectedFiles.add(fileId);
        }
    }

    selectSingleFile(fileId) {
        this.selectedFiles.clear();
        this.selectedFiles.add(fileId);
    }

    updateFileSelection() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            const fileId = item.dataset.fileId;
            if (this.selectedFiles.has(fileId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    async previewFile(file) {
        if (file.serverFilename) {
            // For server files, we need to download and preview
            try {
                const response = await fetch(`${this.apiBaseUrl}/download/${encodeURIComponent(file.serverFilename)}`);
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    
                    if (file.mimeType && file.mimeType.startsWith('image/')) {
                        file.thumbnail = url;
                    } else if (file.mimeType && file.mimeType.startsWith('text/')) {
                        const text = await blob.text();
                        file.content = text;
                    }
                }
            } catch (error) {
                console.error('Preview error:', error);
                this.showNotification('Failed to load file preview', 'error');
                return;
            }
        }
        
        const modal = this.createPreviewModal(file);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePreviewModal();
            }
        });
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closePreviewModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    createPreviewModal(file) {
        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
        modal.id = 'file-preview-modal';
        
        let previewContent = '';
        
        if (file.mimeType && file.mimeType.startsWith('image/') && file.thumbnail) {
            previewContent = `<img src="${file.thumbnail}" alt="${file.name}" class="preview-image">`;
        } else if (file.mimeType && file.mimeType.startsWith('text/') && file.content) {
            previewContent = `<div class="preview-text">${this.escapeHtml(file.content)}</div>`;
        } else {
            previewContent = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem; opacity: 0.5;">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>Preview not available</h3>
                    <p>This file type cannot be previewed</p>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <h3 class="preview-title">${this.escapeHtml(file.name)}</h3>
                    <button class="preview-close" onclick="dashboard.closePreviewModal()">&times;</button>
                </div>
                <div class="preview-body">
                    ${previewContent}
                </div>
                <div class="preview-footer">
                    <div class="preview-info">
                        ${file.size ? `<span>Size: ${this.formatFileSize(file.size)}</span>` : ''}
                        <span>Modified: ${this.formatDate(file.dateModified)}</span>
                    </div>
                    <div class="preview-actions">
                        <button class="btn btn-primary" onclick="dashboard.downloadFileById('${file.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V15" stroke="currentColor" stroke-width="2"/>
                                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    closePreviewModal() {
        const modal = document.getElementById('file-preview-modal');
        if (modal) {
            modal.remove();
        }
    }

    async downloadFileById(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file && file.serverFilename) {
            this.showNotification(`Downloading ${file.name}...`, 'info');
            const result = await this.downloadFileFromServer(file.serverFilename);
            if (result.success) {
                this.showNotification(`Downloaded ${file.name}`, 'success');
            } else {
                this.showNotification(`Failed to download ${file.name}`, 'error');
            }
        }
    }

    renderFiles() {
        const grid = document.querySelector('.file-grid');
        if (!grid) return;

        const filteredFiles = this.files.filter(file =>
            file.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        if (filteredFiles.length === 0) {
            grid.innerHTML = this.getEmptyState();
            return;
        }

        grid.innerHTML = filteredFiles.map(file => this.createFileItemHTML(file)).join('');
        this.attachFileEventListeners();
    }

    getEmptyState() {
        if (this.searchQuery) {
            return `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                        <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>No files found</h3>
                    <p>No files match your search for "${this.searchQuery}"</p>
                </div>
            `;
        }

        return `
            <div class="upload-area" style="grid-column: 1 / -1;" onclick="dashboard.handleUpload()">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem; color: #667eea;">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V15" stroke="currentColor" stroke-width="2"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>Drop files here or click to upload</h3>
                <p>Support for images, documents, and text files</p>
                <button class="upload-btn">Choose Files</button>
            </div>
        `;
    }

    createFileItemHTML(file) {
        const isFolder = file.type === 'folder';
        const fileSize = isFolder ? `${this.folders.get(file.name)?.length || 0} items` : (file.size ? this.formatFileSize(file.size) : '');
        const fileDate = this.formatDate(file.dateModified);
        
        let thumbnailHTML = '';
        if (isFolder) {
            thumbnailHTML = `
                <div class="file-thumbnail folder-thumbnail">
                    <svg class="file-type-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 5H20C20.5304 5 21.0391 5.21071 21.4142 5.58579C21.7893 5.96086 22 6.46957 22 7V19Z" fill="#667eea"/>
                    </svg>
                </div>
            `;
        } else if (file.thumbnail) {
            thumbnailHTML = `
                <div class="file-thumbnail">
                    <img src="${file.thumbnail}" alt="${file.name}">
                </div>
            `;
        } else {
            const iconColor = this.getFileIconColor(file.mimeType);
            thumbnailHTML = `
                <div class="file-thumbnail">
                    <svg class="file-type-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="${iconColor}"/>
                        <polyline points="14,2 14,8 20,8" fill="${iconColor}"/>
                    </svg>
                </div>
            `;
        }

        const actionButtons = isFolder ? `
            <button class="file-action-btn" onclick="dashboard.openFolder(${JSON.stringify(file)})" title="Open Folder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        ` : `
            <button class="file-action-btn" onclick="dashboard.previewFileById('${file.id}')" title="Preview">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <button class="file-action-btn" onclick="dashboard.downloadFileById('${file.id}')" title="Download">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V15" stroke="currentColor" stroke-width="2"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        `;

        return `
            <div class="file-item ${isFolder ? 'folder' : ''}" data-file-id="${file.id}">
                ${thumbnailHTML}
                <div class="file-name">${this.escapeHtml(file.name)}</div>
                <div class="file-info">
                    <span class="file-size">${fileSize}</span>
                    <span class="file-date">${fileDate}</span>
                </div>
                <div class="file-actions">
                    ${actionButtons}
                    <button class="file-action-btn delete" onclick="dashboard.deleteFileById('${file.id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                            <path d="M19,6V20C19,20.5304 18.7893,21.0391 18.4142,21.4142C18.0391,21.7893 17.5304,22 17,22H7C6.46957,22 5.96086,21.7893 5.58579,21.4142C5.21071,21.0391 5,20.5304 5,20V6M8,6V4C8,3.46957 8.21071,2.96086 8.58579,2.58579C8.96086,2.21071 9.46957,2 10,2H14C14.5304,2 15.0391,2.21071 15.4142,2.58579C15.7893,2.96086 16,3.46957 16,4V6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    async previewFileById(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            await this.previewFile(file);
        }
    }

    async deleteFileById(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            const confirmed = await showConfirmDialog(`Are you sure you want to delete "${file.name}"?`, 'Delete', 'Cancel');
            if (!confirmed) return;
            this.showLoadingState();
            try {
                if (file.serverFilename) {
                    const result = await this.deleteFileFromServer(file.serverFilename);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                }
                this.files = this.files.filter(f => f.id !== fileId);
                this.selectedFiles.delete(fileId);
                this.renderFiles();
                this.updateStorageUsageFromServer();
                this.showNotification(`Deleted "${file.name}"`, 'success');
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification(`Failed to delete "${file.name}"`, 'error');
            } finally {
                this.hideLoadingState();
            }
        }
    }

    // Utility functions
    generateFileId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    async createThumbnail(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    getFileIconColor(mimeType) {
        if (!mimeType) return '#9ca3af';
        
        if (mimeType.startsWith('image/')) return '#10b981';
        if (mimeType.includes('pdf')) return '#ef4444';
        if (mimeType.includes('document') || mimeType.includes('word')) return '#3b82f6';
        if (mimeType.startsWith('text/')) return '#8b5cf6';
        
        return '#9ca3af';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoadingState() {
        const grid = document.querySelector('.file-grid');
        if (grid && !document.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-text">Loading...</div>
                </div>
            `;
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
                border-radius: 12px;
            `;
            grid.style.position = 'relative';
            grid.appendChild(overlay);
        }
    }

    hideLoadingState() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    updateRightPanel() {
        const rightPanel = document.querySelector('.right-panel .panel-content');
        if (!rightPanel) return;

        if (this.selectedFiles.size === 1) {
            const fileId = Array.from(this.selectedFiles)[0];
            const file = this.files.find(f => f.id === fileId);
            
            if (file) {
                rightPanel.innerHTML = `
                    <div class="file-details">
                        <h4>File Details</h4>
                        <div class="detail-item">
                            <span class="detail-label">Name</span>
                            <span class="detail-value">${this.escapeHtml(file.name)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${file.type === 'folder' ? 'Folder' : 'File'}</span>
                        </div>
                        ${file.size ? `
                            <div class="detail-item">
                                <span class="detail-label">Size</span>
                                <span class="detail-value">${this.formatFileSize(file.size)}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Modified</span>
                            <span class="detail-value">${this.formatDate(file.dateModified)}</span>
                        </div>
                        ${file.mimeType ? `
                            <div class="detail-item">
                                <span class="detail-label">MIME Type</span>
                                <span class="detail-value">${file.mimeType}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        } else if (this.selectedFiles.size > 1) {
            rightPanel.innerHTML = `
                <div class="file-details">
                    <h4>Multiple Selection</h4>
                    <div class="detail-item">
                        <span class="detail-label">Selected</span>
                        <span class="detail-value">${this.selectedFiles.size} items</span>
                    </div>
                </div>
            `;
        } else {
            rightPanel.innerHTML = `
                <div class="folder-info">
                    <div class="folder-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 5H20C20.5304 5 21.0391 5.21071 21.4142 5.58579C21.7893 5.96086 22 6.46957 22 7V19Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="folder-details">
                        <h4>Folder Name</h4>
                        <p>Stock Photos</p>
                        
                        <h4>Who has access</h4>
                        <div class="access-user">
                            <div class="user-avatar-small">
                                <img src="836.jpg" alt="User">
                            </div>
                            <div class="user-details">
                                <span class="user-name">demo@demo.com</span>
                                <div class="access-level">
                                    <span class="access-dot"></span>
                                    <span>Owner</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateStorageUsage() {
        const totalBytes = this.files.reduce((total, file) => {
            return total + (file.size || 0);
        }, 0);
        
        const maxBytes = 15 * 1024 * 1024 * 1024; // 15 GB in bytes
        const usedGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);
        const usedPercent = ((totalBytes / maxBytes) * 100).toFixed(1);

        const storageUsage = document.querySelector('.storage-usage');
        const storageProgress = document.querySelector('.storage-progress');
        
        if (storageUsage) {
            storageUsage.textContent = `${usedGB} GB of 15 GB used`;
        }
        
        if (storageProgress) {
            storageProgress.style.width = `${Math.min(usedPercent, 100)}%`;
        }
    }

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${this.getNotificationIcon(type)}
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            min-width: 320px;
            max-width: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-left: 4px solid ${this.getNotificationColor(type)};
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4905 2.02168 11.3363C2.16356 9.18203 2.99721 7.13214 4.39828 5.49883C5.79935 3.86553 7.69279 2.72636 9.79619 2.24223C11.8996 1.75809 14.1003 1.95185 16.07 2.79999" stroke="currentColor" stroke-width="2"/><polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18C1.64 18.37 1.54 18.78 1.54 19.2C1.54 20.22 2.36 21.04 3.38 21.04H20.62C21.64 21.04 22.46 20.22 22.46 19.2C22.46 18.78 22.36 18.37 22.18 18L13.71 3.86C13.32 3.12 12.68 2.75 12 2.75C11.32 2.75 10.68 3.12 10.29 3.86Z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2"/></svg>'
        };
        return icons[type] || icons.info;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }
}

// Custom confirmation dialog
function showConfirmDialog(message, confirmText = 'Delete', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Remove any existing dialog
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) existing.remove();

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'custom-confirm-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.35); z-index: 2000; display: flex; align-items: center; justify-content: center;`;
        modal.innerHTML = `
            <div style="background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); padding: 2rem 2.5rem; min-width: 320px; max-width: 90vw; text-align: center;">
                <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1.2rem; color: #1f2937;">${message}</div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="confirm-ok-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.5rem; font-weight: 600; font-size: 1rem; cursor: pointer;">${confirmText}</button>
                    <button id="confirm-cancel-btn" style="background: #f3f4f6; color: #374151; border: none; border-radius: 8px; padding: 0.6rem 1.5rem; font-weight: 600; font-size: 1rem; cursor: pointer;">${cancelText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('confirm-ok-btn').onclick = () => { modal.remove(); resolve(true); };
        document.getElementById('confirm-cancel-btn').onclick = () => { modal.remove(); resolve(false); };
    });
}

// Add notification styles
const notificationStyles = `
    .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
    }
    
    .notification-icon {
        color: #3b82f6;
        flex-shrink: 0;
        margin-top: 2px;
    }
    
    .notification.success .notification-icon {
        color: #10b981;
    }
    
    .notification.error .notification-icon {
        color: #ef4444;
    }
    
    .notification.warning .notification-icon {
        color: #f59e0b;
    }
    
    .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        margin-top: 2px;
        transition: color 0.2s ease;
    }
    
    .notification-close:hover {
        color: #6b7280;
    }
    
    .preview-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        background: #f8fafc;
    }
    
    .preview-info {
        font-size: 0.85rem;
        color: #6b7280;
    }
    
    .preview-info span {
        margin-right: 1rem;
    }
    
    .preview-actions .btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Add notification styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Global dashboard instance
let dashboard;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    dashboard = new Dashboard();
    console.log('Dashboard instance created:', dashboard);
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + A - Select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (dashboard) {
            dashboard.files.forEach(file => {
                dashboard.selectedFiles.add(file.id);
            });
            dashboard.updateFileSelection();
            dashboard.updateRightPanel();
        }
    }
    
    // Delete key - Delete selected files
    if (e.key === 'Delete') {
        if (dashboard && dashboard.selectedFiles.size > 0) {
            dashboard.handleDelete();
        }
    }
    
    // Escape key - Clear selection and close notifications
    if (e.key === 'Escape') {
        if (dashboard) {
            dashboard.selectedFiles.clear();
            dashboard.updateFileSelection();
            dashboard.updateRightPanel();
        }
        
        // Close preview modal
        const modal = document.getElementById('file-preview-modal');
        if (modal) {
            modal.remove();
        }
        
        // Close notifications
        document.querySelectorAll('.notification').forEach(notification => {
            notification.remove();
        });
    }
});