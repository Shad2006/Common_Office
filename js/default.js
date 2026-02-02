(function () {
    "use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
            } else {
            }

            args.setPromise(WinJS.UI.processAll().then(function () {
                initializeNavigation();
                loadApp('publisher');
            }));
        }
    };
    function initializeNavigation() {
        var splitView = document.getElementById('splitView').winControl;
        var listView = document.querySelector('.splitview-pane').winControl;
        var contentHost = document.getElementById('contentHost');
        listView.addEventListener('iteminvoked', function (e) {
            var item = e.detail.itemIndex;
            var appName = document.querySelectorAll('.list-item')[item].getAttribute('data-app');
            loadApp(appName);
        });
        document.getElementById('navButton').addEventListener('click', function () {
            splitView.style.display = "inline";
        });
        document.querySelector('#newFile').addEventListener('click', function () {
            showMessage('Создание нового документа...');
        });

        document.querySelector('#saveFile').addEventListener('click', function () {
            showMessage('Документ сохранен');
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 768) {
                splitView.opened = true;
            } else {
                splitView.opened = false;
            }
        });
    }

    // Загрузка приложения
    function loadApp(appName) {
        var contentHost = document.getElementById('contentHost');
        var appTitle = document.getElementById('appTitle');

        // Обновить заголовок
        appTitle.textContent = appName === 'publisher' ? 'OfficeSuite Publisher' : 'OfficeSuite Mail';

        // Загрузить соответствующую страницу
        WinJS.UI.Pages.render('/html/' + appName + '.html', contentHost)
            .then(function () {
                // Инициализация загруженного приложения
                if (appName === 'publisher') {
                    if (typeof initializePublisher === 'function') {
                        initializePublisher();
                    }
                } else if (appName === 'mail') {
                    if (typeof initializeMail === 'function') {
                        initializeMail();
                    }
                }
            })
            .then(null, function (error) {
                console.error('Error loading app:', error);
                contentHost.innerHTML = '<div class="error-message">Ошибка загрузки приложения</div>';
            });
    }

    // Показать сообщение
    function showMessage(text, type) {
        var message = document.createElement('div');
        message.className = 'message ' + (type || 'info');
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #0078D4;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s;
        `;

        document.body.appendChild(message);

        setTimeout(function () {
            message.style.animation = 'slideOut 0.3s';
            setTimeout(function () {
                document.body.removeChild(message);
            }, 300);
        }, 3000);
    }

    // Добавить CSS анимации
    var style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    app.start();
})();