// https://foundryvtt.com/api/classes/client.FilePicker.html
// https://foundryvtt.com/api/classes/client.FormApplication.html
// https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html

const CONSTS = {
    NAME: 'YouTube Downloader',
    ID: 'yt-downloader',
    API: 'API HERE'
}


async function download(url, stream=False) {
    ui.notifications.info('YT Importer: Beginning download, this can take time depending on the length of the video.');
    downloadFile(url).then(response => {
        ui.notifications.info(`YT Importer: Finished downloading "${response['title']}" to worlds/${game.world.id}/music`);
    })
    .catch(error => {
        ui.notifications.info('YT Importer: Error downloading video. Check console for info.');
    })
}

async function downloadFile(url) {
    return fetch(CONSTS.API + '/download?url=' + url + '&world=' + game.world.id, {
        method: 'GET',
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('YT Imporer: Bad Response: ' + response.statusText);
        }
        return response.json();
    })
    .catch(error => {
        console.error('YT Importer: Error downloading file:', error);
    });
}

async function getYTSearch(query) {
    return fetch(CONSTS.API + '/search?q=' + encodeURIComponent(query), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('YT Search Data Bad Response: ' + response.statusText);
        }
        return response.json();
    })
    .catch(error => {
        console.error('Error fetching YT Search Data:', error);
    });
}

class YTImporterSearch extends FormApplication {
    constructor(options, results={}, stream=false) {
        super(options);
        this.results = results;
        this.stream = stream;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = CONSTS.ID;
        options.template = `modules/${CONSTS.ID}/search.hbs`;
        options.width = 750;
        options.height = 1000;
        options.resizeable = true;
        return options;
    }

    get title() {
        return CONSTS.NAME;
    }

    async _updateObject(event, formData) {
        event.preventDefault();
        const url = event['target']['id']
        return download(url, this.stream);
    }

    async getData(options) {
        return {
            results: this.results
        }
    }
}

class YTImporter extends FormApplication {
    constructor(options) {
        super(options);

        try {
            FilePicker.createDirectory('data', `worlds/${game.world.id}/music`);
            console.log('YT Importer: Music directory created');
        }
        catch (error) {
            console.log('YT Importer: Music directory exists');
        }
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = CONSTS.ID;
        options.template = `modules/${CONSTS.ID}/template.hbs`;
        options.width = 500;
        return options;
    }

    get title() {
        return CONSTS.NAME;
    }

    async _updateObject(event, formData) {
        event.preventDefault();

        const query = formData['yt-query'];
        const stream = formData['yt-stream'];
        if (query.startsWith('https://'))
            return download(query, stream === "");

        getYTSearch(query).then(response => {
            new YTImporterSearch({}, response, stream).render(true);
        })
    }
}


Hooks.on('renderPlaylistDirectory', (app, html, data) => {
    if (!game.user?.isGM && !game.user?.can('SETTINGS_MODIFY')) return;

    const btn = $(`<button class="create-entry"><i class="fas fa-music"></i> ${CONSTS.NAME}</button>`);
    html.find('.directory-header').find('.header-actions').append(btn);

    btn.on('click', (event) => {
        new YTImporter().render(true);
    })
})
