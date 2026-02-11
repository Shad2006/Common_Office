class OfficeSuiteCore {
    constructor() {
        this.currentApp = 'word-processor';
        this.documentManager = new DocumentManager();
        this.fileSystem = new FileSystem();
        this.init();
    }
    async init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        await this.setupNavigation();
        this.setupAppSwitcher();
        this.setupFileOperations();
        await this.loadApp(this.currentApp);
    }
    async setupNavigation() {
        await this.waitForElement('.app-switcher .app-tab');
        const tabs = document.querySelectorAll('.app-switcher .app-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const appName = e.currentTarget.dataset.app;
                console.log('Переключение на приложение:', appName);
                this.switchApp(appName);
            });
        });
    }
    setupAppSwitcher() {
        this.setupAppBar();
        this.setupContextMenu();
    }
    setupFileOperations() {
        this.setupButton('#newFile', () => this.newDocument());
        this.setupButton('#openFile', () => this.openDocument());
        this.setupButton('#saveFile', () => this.saveDocument());
        this.setupButton('#saveAsFile', () => this.saveAsDocument());
        this.setupButton('#printFile', () => this.printDocument());
    }
    setupButton(selector, handler) {
        const button = document.querySelector(selector);
        if (button) {
            button.addEventListener('click', handler);
        } else {
            console.warn('Кнопка не найдена:', selector);
        }
    }
    async switchApp(appName) {
        if (this.currentApp === appName) return;
        await this.saveAppState();
        this.currentApp = appName;
        await this.loadApp(appName);
        this.updateAppSwitcher();
    }
    async loadApp(appName) {
        try {
            const response = await fetch(`html/${appName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const html = await response.text();
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('Контейнер приложений не найден');
            }
            appContainer.innerHTML = html;
            this.loadAppCSS(appName);
            await this.loadAppScript(appName);
            const appInstanceName = `${this.camelCase(appName)}App`;
            if (window[appInstanceName] && typeof window[appInstanceName].init === 'function') {
                await window[appInstanceName].init();
            } else {
                console.warn('Приложение не имеет метода init:', appInstanceName);
            }
     } catch (error) {
            console.error('Ошибка загрузки приложения:', error);
            this.showError(`Не удалось загрузить ${appName}: ${error.message}`);
        }
    }
    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    loadAppCSS(appName) {
        const oldStyles = document.querySelectorAll('link[data-app-style]');
        //oldStyles.forEach(style => style.remove());
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `css/${appName}.css`;
        link.dataset.appStyle = 'true';
        document.head.appendChild(link);
        if (!document.querySelector('link[href*="office-common.css"]')) {
            const commonLink = document.createElement('link');
            commonLink.rel = 'stylesheet';
            commonLink.href = 'css/office-common.css';
            document.head.appendChild(commonLink);
        }
    }

    loadAppScript(appName) {
        return new Promise((resolve, reject) => {
            const oldScripts = document.querySelectorAll('script[data-app-script]');
            oldScripts.forEach(script => script.remove());
            const script = document.createElement('script');
            script.src = `js/${appName}.js`;
            script.dataset.appScript = 'true';
            script.onload = () => {
                console.log(`Скрипт ${appName}.js загружен`);
                resolve();
            };
            script.onerror = () => {
                console.error(`Не удалось загрузить ${appName}.js`);
                reject(new Error(`Не удалось загрузить ${appName}.js`));
            };
            document.head.appendChild(script);
        });
    }
    async newDocument() {
        const appInstance = this.getCurrentAppInstance();
        if (appInstance && typeof appInstance.newDocument === 'function') {
            await appInstance.newDocument();
        } else {
            this.showMessage('Функция создания документа не доступна');
        }
    }

    async openDocument() {
        try {
            const picker = new Windows.Storage.Pickers.FileOpenPicker();
            picker.fileTypeFilter.replaceAll([".html"]);
            const file = await picker.pickSingleFileAsync();
            if (file) {
                const content = await Windows.Storage.FileIO.readTextAsync(file);
                const appInstance = this.getCurrentAppInstance();
                    await appInstance.openDocument(content, file.name);
                
            }
        } catch (error) {
            console.error('Ошибка открытия файла:', error);
            this.showError('Не удалось открыть файл');
        }
    }

    async saveDocument() {
        const appInstance = this.getCurrentAppInstance();
        if (appInstance && typeof appInstance.saveDocument === 'function') {
            await appInstance.saveDocument(false);
        } else {
            this.showMessage('Функция сохранения не доступна');
        }
    }

    async saveAsDocument() {
        const appInstance = this.getCurrentAppInstance();
        if (appInstance && typeof appInstance.saveDocument === 'function') {
            await appInstance.saveDocument(true);
        } else {
            this.showMessage('Функция сохранения как не доступна');
        }
    }

    async printDocument() {
        try {
            window.print();
        } catch (error) {
            console.error('Ошибка печати:', error);
            this.showError('Не удалось начать печать');
        }
    }

    getCurrentAppInstance() {
        const appInstanceName = `${this.camelCase(this.currentApp)}App`;
        return window[appInstanceName];
    }

    setupAppBar() {
        const appBar = document.getElementById('appBar');
        appBar.setAttribute('data-win-control', 'WinJS.UI.AppBar');
        if (!appBar) {
            console.warn('AppBar не найден');
            return;
        }
        //appBar.innerHTML = '';
        const buttons = [
            { id: 'newFile', label: 'Создать', command: () => this.newDocument() },
            { id: 'openFile', label: 'Открыть', command: () => this.openDocument() },
            { id: 'saveFile', label: 'Сохранить', command: () => this.saveDocument() },
            { id: 'saveAsFile', label: 'Сохранить как', command: () => this.saveAsDocument() },
            { id: 'printFile', label: 'Печать', command: () => this.printDocument() }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'win-button';
            button.setAttribute('data-win-control', 'WinJS.UI.AppBarCommand');
            button.setAttribute('data-win-options', `{id:'${btn.id}',label:'${btn.label}',icon:'add'}`);
            button.innerHTML = `<span>${btn.label}</span>`;
            button.addEventListener('click', btn.command);
            appBar.appendChild(button);
        });
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('[contenteditable="true"], .editable')) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY);
            }
        });
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
        const hideMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', hideMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    updateAppSwitcher() {
        const tabs = document.querySelectorAll('.app-switcher .app-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.app === this.currentApp) {
                tab.classList.add('active');
            }
        });
        const appTitles = {
            'word-processor': 'Текстовый процессор',
            'spreadsheet': 'Табличный редактор',
            'presentation': 'Редактор презентаций',
            'graphics-editor': 'Графический редактор',
            'database': 'Система управления базами данных',
            'html-editor': 'HTML редактор'
        };

        const titleElement = document.getElementById('appTitle');
        if (titleElement) {
            titleElement.textContent = appTitles[this.currentApp] || 'Office Suite';
        }
    }

    async saveAppState() {
        const appInstance = this.getCurrentAppInstance();
        if (appInstance && typeof appInstance.getState === 'function') {
            const state = appInstance.getState();
            await this.documentManager.saveState(this.currentApp, state);
        }
    }

    async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Элемент ${selector} не найден за ${timeout}ms`));
            }, timeout);
        });
    }

    showMessage(text) {
        console.log('Сообщение:', text);
        alert(text);
    }

    showError(text) {
        console.error('Ошибка:', text);
        alert(`Ошибка: ${text}`);
    }
}
class DocumentManager {
    constructor() {
        this.documents = new Map();
    }

    async saveState(appName, state) {
        this.documents.set(appName, state);
        try {
            const appData = Windows.Storage.ApplicationData.current;
            const localFolder = appData.localFolder;
            const file = await localFolder.createFileAsync(
                `${appName}_state.json`,
                Windows.Storage.CreationCollisionOption.replaceExisting
            );
            await Windows.Storage.FileIO.writeTextAsync(file, JSON.stringify(state));
            console.log(`Состояние ${appName} сохранено`);
        } catch (error) {
            console.warn('Не удалось сохранить состояние:', error);
        }
    }

    async loadState(appName) {
        try {
            const appData = Windows.Storage.ApplicationData.current;
            const localFolder = appData.localFolder;
            const file = await localFolder.getFileAsync(`${appName}_state.json`);
            const content = await Windows.Storage.FileIO.readTextAsync(file);
            console.log(`Состояние ${appName} загружено`);
            return JSON.parse(content);
        } catch (error) {
            console.log('Состояние не найдено:', error.message);
            return null;
        }
    }
}
class FileSystem {
    async saveFile(content, fileName, fileType) {
        try {
            const picker = new Windows.Storage.Pickers.FileSavePicker();
            picker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
            picker.fileTypeChoices.insert(fileType, [`.${fileType.toLowerCase()}`]);
            picker.suggestedFileName = fileName;

            const file = await picker.pickSaveFileAsync();
            if (file) {
                await Windows.Storage.FileIO.writeTextAsync(file, content);
                console.log(`Файл сохранен: ${file.name}`);
                return file;
            }
            return null;
        } catch (error) {
            console.error('Ошибка сохранения файла:', error);
            throw error;
        }
    }
    async openDocument() {
        const appInstance = this.getCurrentAppInstance();
        if (appInstance && typeof appInstance.openDocument === 'function') {
            try {
                await appInstance.openDocument();
            } catch (error) {
                console.error('Ошибка открытия файла:', error);
                this.showError('Не удалось открыть файл');
            }
        } else {
        }
    }
}
let officeSuite = null;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        officeSuite = new OfficeSuiteCore();
        window.officeSuite = officeSuite;
    });
} else {
    officeSuite = new OfficeSuiteCore();
    window.officeSuite = officeSuite;
}
window.DocumentManager = DocumentManager;
window.FileSystem = FileSystem;