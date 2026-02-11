class WordProcessorApp {
    constructor() {
        this.currentDocument = {
            content: '',
            metadata: {
                title: 'Новый документ',
                author: '',
                created: new Date(),
                modified: new Date()
            },
            settings: {
                fontFamily: 'Times New Roman',
                fontSize: 12,
                lineHeight: 1.5
            }
        };

        this.editor = null;
        this.isModified = false;
        this.fileSystem = new FileSystem();
        this.init();
    }

    init() {
        this.setupEditor();
        this.setupToolbar();
        this.setupEventListeners();
        this.loadDefaultTemplate();
    }

    setupEditor() {
        this.editor = document.getElementById('documentEditor');
        if (!this.editor) {
            console.error('Элемент редактора не найден');
            return;
        }
        this.editor.style.fontFamily = this.currentDocument.settings.fontFamily;
        this.editor.style.fontSize = `${this.currentDocument.settings.fontSize}pt`;
        this.editor.style.lineHeight = this.currentDocument.settings.lineHeight;
    }

    setupToolbar() {
        document.querySelectorAll('[data-command]').forEach(button => {
            button.addEventListener('click', (e) => {
                const command = e.target.closest('[data-command]').dataset.command;
                this.execCommand(command);
            });
        });
        const fontFamilySelect = document.getElementById('fontFamily');
        if (fontFamilySelect) {
            fontFamilySelect.value = this.currentDocument.settings.fontFamily;
            fontFamilySelect.addEventListener('change', (e) => {
                this.changeFontFamily(e.target.value);
            });
        }
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.value = this.currentDocument.settings.fontSize;
            fontSizeSelect.addEventListener('change', (e) => {
                this.changeFontSize(e.target.value);
            });
        }
        const textColorInput = document.getElementById('textColor');
        if (textColorInput) {
            textColorInput.addEventListener('change', (e) => {
                this.execCommand('foreColor', e.target.value);
            });
        }
        const bgColorInput = document.getElementById('backgroundColor');
        if (bgColorInput) {
            bgColorInput.addEventListener('change', (e) => {
                this.execCommand('backColor', e.target.value);
            });
        }
        document.querySelectorAll('.style-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const style = e.target.dataset.style;
                this.applyStyle(style);
            });
        });
        ['leftIndent', 'rightIndent', 'firstLineIndent'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', (e) => {
                    this.changeIndent(id, e.target.value);
                });
            }
        });
    }
    setupEventListeners() {
        if (this.editor) {
            this.editor.addEventListener('input', () => {
                this.isModified = true;
                this.currentDocument.metadata.modified = new Date();
                this.updateWordCount();
            });
        }
        
        ['newDocument', 'openDocument', 'saveDocument', 'saveAsDocument'].forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this[id]());
            }
        });
        const insertTableBtn = document.getElementById('insertTable');
        if (insertTableBtn) {
            insertTableBtn.addEventListener('click', () => this.insertTable());
        }
        const insertImageBtn = document.getElementById('insertImage');
        if (insertImageBtn) {
            insertImageBtn.addEventListener('click', () => this.insertImage());
        }
    }

    loadDefaultTemplate() {
        if (this.editor) {
            this.editor.innerHTML = `
                <h1>Новый документ</h1>
                <p>Начните ввод текста здесь...</p>
            `;
            this.currentDocument.content = this.editor.innerHTML;
        }
    }

    execCommand(command, value = null) {
        if (!this.editor) return;

        document.execCommand(command, false, value);
        this.editor.focus();
        this.isModified = true;
        this.updateToolbarState();
    }

    updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
        commands.forEach(command => {
            const button = document.querySelector(`[data-command="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });
    }

    changeFontFamily(fontFamily) {
        if (this.editor) {
            this.editor.style.fontFamily = fontFamily;
            this.currentDocument.settings.fontFamily = fontFamily;
            this.isModified = true;
        }
    }

    changeFontSize(size) {
        if (this.editor) {
            this.editor.style.fontSize = `${size}pt`;
            this.currentDocument.settings.fontSize = size;
            this.isModified = true;
        }
    }

    applyStyle(style) {
        const styles = {
            'normal': { tag: 'p', class: '' },
            'heading1': { tag: 'h1', class: 'heading-1' },
            'heading2': { tag: 'h2', class: 'heading-2' },
            'quote': { tag: 'blockquote', class: 'quote' }
        };

        if (styles[style]) {
            this.execCommand('formatBlock', `<${styles[style].tag}>`);
        }
    }

    changeIndent(type, value) {
        if (!this.editor) return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const element = range.commonAncestorContainer.nodeType === 3
            ? range.commonAncestorContainer.parentNode
            : range.commonAncestorContainer;

        if (element.style) {
            switch (type) {
                case 'leftIndent':
                    element.style.marginLeft = `${value}px`;
                    break;
                case 'rightIndent':
                    element.style.marginRight = `${value}px`;
                    break;
                case 'firstLineIndent':
                    element.style.textIndent = `${value}px`;
                    break;
            }
        }

        this.isModified = true;
    }

    async newDocument() {
        if (this.isModified && !confirm('Есть несохраненные изменения. Создать новый документ?')) {
            return;
        }

        this.currentDocument = {
            content: '',
            metadata: {
                title: 'Новый документ',
                author: '',
                created: new Date(),
                modified: new Date()
            },
            settings: {
                fontFamily: 'Times New Roman',
                fontSize: 12,
                lineHeight: 1.5
            }
        };

        this.loadDefaultTemplate();
        this.isModified = false;

        console.log('Создан новый документ');
    }

    async openDocument(content = null, fileName = null) {
        try {
            let fileContent = content;
            let file = null;
            if (!content) {
                const picker = new Windows.Storage.Pickers.FileOpenPicker();
                picker.fileTypeFilter.replaceAll(['.txt', '.html', '.docx', '.rtf']);
                file = await picker.pickSingleFileAsync();
                if (!file) return;

                fileContent = await Windows.Storage.FileIO.readTextAsync(file);
                fileName = file.name;
            }
            if (this.editor) {
                if (fileName && fileName.endsWith('.html')) {
                    fileContent = this.sanitizeHTML(fileContent);
                    this.editor.innerHTML = fileContent;
                } else {
                    this.editor.textContent = fileContent;
                }
                this.currentDocument.content = fileContent;
                this.currentDocument.metadata.title = fileName || 'Открытый документ';
                this.currentDocument.metadata.modified = new Date();
                this.isModified = false;
                this.editor.focus();

                this.updateWordCount();
            }
        } catch (error) {
            console.error('Ошибка открытия документа:', error);
            throw error;
        }
    }

    sanitizeHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('style, link, script, meta, base').forEach(el => el.remove());
        tempDiv.querySelectorAll('*[style]').forEach(el => {
            el.removeAttribute('style');
        });
        tempDiv.querySelectorAll('*[class]').forEach(el => {
            el.removeAttribute('class');
        });

        tempDiv.querySelectorAll('*[id]').forEach(el => {
            el.removeAttribute('id');
        });
        tempDiv.querySelectorAll('html, head, body').forEach(el => {
            const div = document.createElement('div');
            while (el.firstChild) {
                div.appendChild(el.firstChild);
            }
            el.parentNode.replaceChild(div, el);
        });

        return tempDiv.innerHTML;
    }

    async saveDocument(saveAs = false) {
        try {
            if (!this.editor) return;

            const content = this.editor.innerHTML;
            const fileName = `${this.currentDocument.metadata.title || 'Документ'}.html`;

            await officeSuite.fileSystem.saveFile(content, fileName, 'html');

            this.isModified = false;
            console.log('Документ сохранен');
        } catch (error) {
            console.error('Ошибка сохранения документа:', error);
        }
    }

    insertTable() {
        if (!this.editor) return;
        /*
        const rows = prompt('Количество строк:', '3');
        const cols = prompt('Количество столбцов:', '3');
        */
        let rows = 3;
        let cols = 3;
        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            for (let i = 0; i < rows; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < cols; j++) {
                    tableHTML += `<td style="padding: 5px; border: 1px solid #ccc;">Ячейка ${i + 1}-${j + 1}</td>`;
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';
            this.execCommand('insertHTML', tableHTML);
        }
    }
    async insertImage() {
        try {
            const picker = new Windows.Storage.Pickers.FileOpenPicker();
            picker.fileTypeFilter.replaceAll(['.jpg', '.jpeg', '.png', '.gif']);
            //picker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            const file = await picker.pickSingleFileAsync();
            if (file) {
                const imgHTML = `<img src="${URL.createObjectURL(file)}" style="max-width: 100%;" alt="${file.name}">`;
                this.execCommand('insertHTML', imgHTML);
            }
        } catch (error) {
            console.error('Ошибка вставки изображения:', error);
        }
    }
    updateWordCount() {
        if (!this.editor) return;

        const text = this.editor.textContent || this.editor.innerText;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        const chars = text.length;
        const wordCountElement = document.getElementById('wordCount');
        if (wordCountElement) {
            wordCountElement.textContent = `Слов: ${words}, Символов: ${chars}`;
        }
    }

    getState() {
        return {
            content: this.editor ? this.editor.innerHTML : '',
            settings: this.currentDocument.settings,
            metadata: this.currentDocument.metadata,
            isModified: this.isModified
        };
    }
}
if (typeof window.wordProcessorApp === 'undefined') {
    window.wordProcessorApp = new WordProcessorApp();
}
