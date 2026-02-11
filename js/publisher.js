class Publisher {
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
                lineHeight: 1.5,
                pageSize: 'A4',
                orientation: 'portrait',
                margins: { top: 20, bottom: 20, left: 20, right: 20 },
                columns: 1
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
        this.updatePageInfo();
    }

    setupEditor() {
        this.editor = document.getElementById('publicationEditor');
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
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const addPageBtn = document.getElementById('addPage');

        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.prevPage());
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.nextPage());
        if (addPageBtn) addPageBtn.addEventListener('click', () => this.addPage());
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            pageSizeSelect.value = this.currentDocument.settings.pageSize;
            pageSizeSelect.addEventListener('change', (e) => {
                this.currentDocument.settings.pageSize = e.target.value;
                this.isModified = true;
            });
        }

        document.querySelectorAll('input[name="orientation"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.currentDocument.settings.orientation = radio.value;
                this.isModified = true;
            });
        });

        ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = this.currentDocument.settings.margins[id.replace('margin', '').toLowerCase()];
                input.addEventListener('change', (e) => {
                    this.currentDocument.settings.margins[id.replace('margin', '').toLowerCase()] = parseInt(e.target.value, 10);
                    this.isModified = true;
                });
            }
        });

        const columnsInput = document.getElementById('columns');
        if (columnsInput) {
            columnsInput.value = this.currentDocument.settings.columns;
            columnsInput.addEventListener('change', (e) => {
                this.currentDocument.settings.columns = parseInt(e.target.value, 10);
                this.isModified = true;
            });
        }
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const templateId = e.target.closest('.template-item').dataset.template;
                this.loadTemplate(templateId);
            });
        });
    }
    loadTemplate(templateId) {
        const templates = {
            brochure: `
            <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <h1 style="text-align: center; color: #2c3e50; font-size: 28pt; margin-bottom: 10px;">Брошюра</h1>
                <p style="text-align: center; color: #7f8c8d; font-size: 12pt; margin-bottom: 30px;">Введите подзаголовок здесь</p>
                <hr style="border-color: #3498db; border-width: 2px; margin: 20px 0;">
                <section style="margin-bottom: 40px;">
                    <h2 style="color: #2980b9; font-size: 16pt; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Раздел 1</h2>
                    <p style="line-height: 1.6; color: #34495e; margin-top: 15px;">Описание первого раздела. Здесь можно разместить ключевую информацию, преимущества или детали продукта.</p>
                </section>
                <section style="margin-bottom: 40px;">
                    <h2 style="color: #2980b9; font-size: 16pt; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Раздел 2</h2>
                    <p style="line-height: 1.6; color: #34495e; margin-top: 15px;">Описание второго раздела. Добавьте примеры, статистику или отзывы.</p>
                </section>
                <div style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 10pt;">
                    © 2024 Ваша компания. Все права защищены.
                </div>
            </div>
        `,
            flyer: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; font-size: 24pt; font-weight: bold; color: #c0392b; margin-bottom: 20px;">АКЦИЯ!</div>
                <p style="text-align: justify; line-height: 1.6; color: #2c3e50; margin-bottom: 25px;">
                    Спешите приобрести наш продукт по специальной цене! В этом блоке разместите краткое описание предложения, сроки акции и ключевые выгоды.
                </p>
                <div style="background: #27ae60; color: white; text-align: center; padding: 15px; border-radius: 8px; font-size: 14pt; font-weight: bold; margin: 20px 0;">
                    СКИДКА 30% ДО КОНЦА МЕСЯЦА
                </div>
                <div style="margin-top: 25px; text-align: center; color: #7f8c8d; font-size: 11pt;">
                    <strong>Контакты:</strong> +7 (XXX) XXX-XX-XX | email@domain.com | site.com
                </div>
            </div>
        `,
            booklet: `
            <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 25px;">
                <h1 style="text-align: center; color: #8e44ad; font-size: 26pt; margin-bottom: 20px;">Буклет</h1>
                <div style="display: flex; gap: 30px; margin-top: 20px;">
                    <div style="flex: 1; background: #f8f9fa; border: 1px solid #e1e5e9; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #8e44ad; font-size: 14pt; margin-top: 0;">Левая панель</h3>
                        <p style="line-height: 1.5; color: #495057;">Текст левой панели. Опишите преимущества, характеристики или историю компании.</p>
                    </div>
                    <div style="flex: 1; background: #f8f9fa; border: 1px solid #e1e5e9; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #8e44ad; font-size: 14pt; margin-top: 0;">Правая панель</h3>
                        <p style="line-height: 1.5; color: #495057;">Текст правой панели. Добавьте изображения, списки или контактную информацию.</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #bdc3c7; font-size: 9pt;">
                    Двусторонний буклет. Печатайте на плотной бумаге.
                </div>
            </div>
        `,
            businesscard: `
            <div style="width: 90mm; height: 50mm; font-family: 'Helvetica Neue', Arial, sans-serif; position: relative; overflow: hidden; box-sizing: border-box;">
                <!-- Лицевая сторона -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #3498db; color: white; padding: 12px; display: flex; flex-direction: column; justify-content: center; text-align: center;">
                    <div style="font-size: 16pt; font-weight: bold; margin-bottom: 5px; letter-spacing: 0.5px;">ИВАНОВ И.И.</div>
                    <div style="font-size: 12pt; margin-bottom: 15px;">Менеджер по продажам</div>
                    <div style="font-size: 10pt; line-height: 1.4;">
                        Тел.: +7 (999) 123-45-67<br>
                        Email: ivan@company.com<br>
                        Сайт: company.com
                    </div>
                </div>
                <!-- Оборотная сторона (опционально) -->
                <div style="position: absolute; bottom: 5px; right: 5px; color: rgba(255,255,255,0.7); font-size: 8pt;">
                    v.1.0
                </div>
            </div>
        `,
            certificate: `
            <div style="font-family: 'Playfair Display', serif; text-align: center; padding: 60px 40px; background: linear-gradient(to bottom, #fdfdfd, #f5f5f5); border: 3px double #d4af37; border-radius: 15px; max-width: 800px; margin: 20px auto;">
                <h1 style="font-size: 42pt; color: #b8860b; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">СЕРТИФИКАТ</h1>
                <p style="font-size: 20pt; color: #555; margin: 15px 0;">о прохождении курса</p>
                <p style="font-size: 32pt; font-weight: bold; color: #2c3e50; margin: 30px 0 4
        `,
            postcard: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fdf6e3 0%, #f5e9d9 100%); border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); padding: 40px 30px; position: relative; overflow: hidden;">
  <!-- Уголок конверта -->
  <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: #d4a574; transform: rotate(45deg); z-index: 0;"></div>
  
  <div style="text-align: center; position: relative; z-index: 1;">
    <h1 style="color: #8b4513; font-size: 32pt; margin: 0 0 15px 0; letter-spacing: 1px;">С Днём рождения!</h1>
    <p style="color: #5a3921; font-size: 16pt; line-height: 1.6; margin: 0 0 25px 0;">
      Дорогой(ая) [Имя]!<br>
      От всей души поздравляю Вас с этим прекрасным днём!
    </p>
    <div style="border-top: 2px dashed #d4a574; width: 80%; margin: 25px auto 30px;"></div>
    <p style="font-style: italic; color: #774e24; font-size: 14pt; line-height: 1.7; margin: 0;">
      Пусть в Вашей жизни будет больше радости, тепла и счастливых моментов.<br>
      Желаю крепкого здоровья, исполнения желаний и новых ярких впечатлений!
    </p>
    <div style="margin-top: 40px; text-align: right; color: #a06b42; font-size: 12pt;">
      С тёплыми пожеланиями,<br>
      [Ваше имя]
    </div>
  </div>
</div>

        `,
            calendar: `<div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: 0 auto; background: #fffaf3; border: 2px solid #e6d6c1; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
  <h2 style="text-align: center; color: #b5651d; font-size: 24pt; margin-top: 0; margin-bottom: 20px;">Календарь на 2024 год</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 0 auto;">
    <thead>
      <tr style="background: #d4a574; color: white;">
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt;">Пн</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt;">Вт</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt;">Ср</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt;">Чт</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt;">Пт</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt; color: #e74c3c;">Сб</th>
        <th style="padding: 12px 8px; border: 1px solid #c8b096; font-size: 11pt; color: #e74c3c;">Вс</th>
      </tr>
    </thead>
    <tbody>
      <!-- Неделя 1 -->
      <tr>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; color: #999;">25</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; color: #999;">26</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; color: #999;">27</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; color: #999;">28</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">1</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; background: #ffebee; color: #c0392b;">2</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; background: #ffebee; color: #c0392b;">3</td>
      </tr>
      <!-- Неделя 2 -->
      <tr>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">4</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">5</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">6</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">7</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center;">8</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; background: #ffebee; color: #c0392b;">9</td>
        <td style="padding: 10px; border: 1px solid #e6d6c1; text-align: center; background: #ffebee; color: #c0392b;">10</td>
      </tr>
    </tbody>
  </table>
  <p style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 10pt;">
    * Выходные выделены красным
  </p>
</div>

        `,
            menu: `
            <div style="font-family: 'Cormorant Garamond', serif; max-width: 800px; margin: 0 auto; background: #fcf9f0; border: 3px double #d4b88c; border-radius: 18px; padding: 40px 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.12);">
  <h1 style="text-align: center; color: #8e5e3f; font-size: 42pt; margin: 0 0 10px 0; text-transform: uppercase
            <section style="margin-bottom: 20px;">
                <h2>Закуски</h2>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Брускетта с томатами</strong> — 350 ₽</li>
                    <li><strong>Сырная тарелка</strong> — 450 ₽</li>
                </ul>
            </section>
            <section style="margin-bottom: 20px;">
                <h2>Основные блюда</h2>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Стейк рибай</strong> — 1200 ₽</li>
                    <li><strong>Паста карбонара</strong> — 650 ₽</li>
                </ul>
            </section>
            <section>
                <h2>Напитки</h2>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Кофе американо</strong> — 150 ₽</li>
                    <li><strong>Чай зелёный</strong> — 120 ₽</li>
                </ul>
            </section></div>
        `
        };

        if (templates[templateId]) {
            if (this.editor) {
                this.editor.innerHTML = templates[templateId];
                this.currentDocument.content = this.editor.innerHTML;
                this.isModified = true;
                console.log(`Загружен шаблон: ${templateId}`);
            }
        } else {
            console.warn(`Шаблон с ID "${templateId}" не найден`);
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
            this.execCommand('formatBlock', `< ${ styles[style].tag }> `);
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
                    element.style.marginLeft = `${ value } px`;
                    break;
                case 'rightIndent':
                    element.style.marginRight = `${ value } px`;
                    break;
                case 'firstLineIndent':
                    element.style.textIndent = `${ value } px`;
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
                lineHeight: 1.5,
                pageSize: 'A4',
                orientation: 'portrait',
                margins: { top: 20, bottom: 2, left: 20, right: 20 },
                columns: 1
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
            const fileName = `${ this.currentDocument.metadata.title || 'Документ' }.html`;

            await officeSuite.fileSystem.saveFile(content, fileName, 'html');

            this.isModified = false;
            console.log('Документ сохранен');
        } catch (error) {
            console.error('Ошибка сохранения документа:', error);
        }
    }

    insertTable() {
        if (!this.editor) return;
        let rows = 3;
        let cols = 3;
        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            for (let i = 0; i < rows; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < cols; j++) {
                    tableHTML += `< td style = "padding: 5px; border: 1px solid #ccc;" > Ячейка ${ i + 1 } -${ j + 1 }</td > `;
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
            const file = await picker.pickSingleFileAsync();
            if (file) {
                const imgHTML = `< img src = "${URL.createObjectURL(file)}" style = "max-width: 100%;" alt = "${file.name}" > `;
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
            wordCountElement.textContent = `Слов: ${ words }, Символов: ${ chars } `;
        }
    }

    prevPage() {
        console.log('Переход на предыдущую страницу');
    }

    nextPage() {
        console.log('Переход на следующую страницу');
    }

    addPage() {
        console.log('Добавление новой страницы');
    }

    updatePageInfo() {
        const pageInfoElement = document.getElementById('pageInfo');
        if (pageInfoElement) {
            pageInfoElement.textContent = 'Страница 1 из 1';
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
    window.PublisherApp = new Publisher();
