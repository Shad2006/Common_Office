// Ядро Office Suite UWP
class OfficeSuiteCore {
    constructor() {
        this.currentApp = 'word-processor';
        this.documentManager = new DocumentManager();
        this.fileSystem = new FileSystem();
        this.init();
    }

    async init() {
        // Ждем полной загрузки DOM
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
        // Ждем появления элементов навигации
        await this.waitForElement('.app-switcher .app-tab');

        // Навигация между приложениями
        const tabs = document.querySelectorAll('.app-switcher .app-tab');
        console.log('Найдено вкладок:', tabs.length);

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const appName = e.currentTarget.dataset.app;
                console.log('Переключение на приложение:', appName);
                this.switchApp(appName);
            });
        });
    }

    setupAppSwitcher() {
        // AppBar и меню
        this.setupAppBar();
        this.setupContextMenu();
    }

    setupFileOperations() {
        // Обработчики для файловых операций
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

        console.log('Переключение с', this.currentApp, 'на', appName);

        // Сохраняем текущее состояние
        await this.saveAppState();

        // Переключаем приложение
        this.currentApp = appName;
        await this.loadApp(appName);

        // Обновляем UI
        this.updateAppSwitcher();
    }

    async loadApp(appName) {
        try {
            console.log('Загрузка приложения:', appName);

            // Загружаем HTML приложения
            const response = await fetch(`html/${appName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Вставляем в контейнер
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('Контейнер приложений не найден');
            }

            appContainer.innerHTML = html;

            // Загружаем CSS
            this.loadAppCSS(appName);

            // Загружаем JS приложения
            await this.loadAppScript(appName);

            // Инициализируем приложение
            const appInstanceName = `${this.camelCase(appName)}App`;
            if (window[appInstanceName] && typeof window[appInstanceName].init === 'function') {
                await window[appInstanceName].init();
            } else {
                console.warn('Приложение не имеет метода init:', appInstanceName);
            }

            console.log(`Приложение ${appName} успешно загружено`);
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
        oldStyles.forEach(style => style.remove());
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
            // Удаляем старые скрипты
            const oldScripts = document.querySelectorAll('script[data-app-script]');
            oldScripts.forEach(script => script.remove());

            // Динамически загружаем JS
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

    // Файловые операции
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
            picker.fileTypeFilter.replaceAll([".docx", ".txt", ".html", ".json"]);
            const file = await picker.pickSingleFileAsync();

            if (file) {
                const content = await Windows.Storage.FileIO.readTextAsync(file);
                const appInstance = this.getCurrentAppInstance();

                if (appInstance && typeof appInstance.loadDocument === 'function') {
                    await appInstance.loadDocument(content, file.name);
                }
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
        // Динамическое обновление AppBar
        const appBar = document.getElementById('appBar');
        if (!appBar) {
            console.warn('AppBar не найден');
            return;
        }

        // Очищаем старые кнопки
        appBar.innerHTML = '';

        // Добавляем общие кнопки
        const buttons = [
            { id: 'newFile', label: 'Создать', icon: '📄', command: () => this.newDocument() },
            { id: 'openFile', label: 'Открыть', icon: '📂', command: () => this.openDocument() },
            { id: 'saveFile', label: 'Сохранить', icon: '💾', command: () => this.saveDocument() },
            { id: 'saveAsFile', label: 'Сохранить как', icon: '💾', command: () => this.saveAsDocument() },
            { id: 'printFile', label: 'Печать', icon: '🖨️', command: () => this.printDocument() }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'win-button';
            button.innerHTML = `<span>${btn.icon} ${btn.label}</span>`;
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
        // Показываем контекстное меню
        const menu = document.getElementById('contextMenu');
        if (!menu) return;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';

        // Скрываем меню при клике
        const hideMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', hideMenu);
        };

        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    updateAppSwitcher() {
        // Обновляем активную вкладку
        const tabs = document.querySelectorAll('.app-switcher .app-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.app === this.currentApp) {
                tab.classList.add('active');
            }
        });

        // Обновляем заголовок
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
        // Сохраняем состояние текущего приложения
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
        // Простая реализация показа сообщения
        alert(text);
    }

    showError(text) {
        console.error('Ошибка:', text);
        alert(`Ошибка: ${text}`);
    }
}

// Менеджер документов
class DocumentManager {
    constructor() {
        this.documents = new Map();
    }

    async saveState(appName, state) {
        this.documents.set(appName, state);

        // Сохраняем в локальное хранилище
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

// Работа с файловой системой
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

    async openFile(fileTypes) {
        try {
            const picker = new Windows.Storage.Pickers.FileOpenPicker();
            picker.fileTypeFilter.replaceAll(fileTypes);
            const file = await picker.pickSingleFileAsync();
            if (file) {
                console.log(`Файл открыт: ${file.name}`);
            }
            return file;
        } catch (error) {
            console.error('Ошибка открытия файла:', error);
            throw error;
        }
    }
}

// Инициализация приложения
let officeSuite = null;

// Ждем полной загрузки документа
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM загружен, инициализация OfficeSuite...');
        officeSuite = new OfficeSuiteCore();
        window.officeSuite = officeSuite;
    });
} else {
    console.log('DOM уже загружен, инициализация OfficeSuite...');
    officeSuite = new OfficeSuiteCore();
    window.officeSuite = officeSuite;
}

// Экспортируем для использования в других модулях
window.DocumentManager = DocumentManager;
window.FileSystem = FileSystem;