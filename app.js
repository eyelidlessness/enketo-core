/* eslint no-console: 0 */

/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */

import config from 'enketo/config';
import support from './src/js/support';
import { Form } from './src/js/form';
import fileManager from './src/js/file-manager';
import events from './src/js/event';
import { fixGrid, styleToAll, styleReset } from './src/js/print';

const theme = config.defaultTheme ?? 'material';

if (theme === 'formhub') {
    /** @type {HTMLLinkElement} */
    const fontsStylesheetLink = document.getElementById(
        'theme-link-formhub-fonts'
    );

    fontsStylesheetLink.rel = 'stylesheet';
    fontsStylesheetLink.type = 'text/css';

    /** @type {NodeListOf<HTMLLinkElement>} */
    const themeStylesheetLinks = document.querySelectorAll(
        '#theme-link-main, #theme-link-print'
    );

    themeStylesheetLinks.forEach((link) => {
        link.href = link.href.replace('material', 'formhub');
    });
}

/** @type {HTMLImageElement} */
let brandImage = null;

const { source: logoSource, href: logo = logoSource } = config.logo ?? {};

if (logo != null) {
    brandImage = document.querySelector('.logo-wrapper > img');

    brandImage.src = logo;
}

let form;
let formStr;
let modelStr;
const xform = decodeURIComponent(getURLParameter('xform'));

// if querystring touch=true is added, override detected touchscreen presence
if (getURLParameter('touch') === 'true') {
    support.touch = true;
    document.querySelector('html').classList.add('touch');
}

let formEl;

// Check if HTML form is hardcoded or needs to be retrieved
// note: when running this file in enketo-core-performance-monitor xform = 'null'
if (xform && xform !== 'null') {
    document.querySelector('.guidance').remove();

    (async () => {
        const isRemote = /^https?:\/\//.test(xform);
        const xformURL = isRemote ? xform : `${location.origin}/${xform}`;
        const transformerUrl = `http://${location.hostname}:8085/transform?xform=${xformURL}`;

        try {
            /** @type {import('enketo-transformer').TransformedSurvey & { modifiedTime?: number } | null} */
            let survey = null;

            if (!isRemote) {
                // This must be dynamically imported or it'll be included in the build
                const localForms = (await import(`./${'forms'}.mjs`)).default;
                const localForm = localForms[xform];

                if (localForm != null) {
                    survey = {
                        form: localForm.html_form,
                        model: localForm.xml_model,
                    };
                }
            }

            if (survey == null) {
                const response = await fetch(transformerUrl);

                survey = await response.json();
            }

            formStr = survey.form;
            modelStr = survey.model;
            const range = document.createRange();
            formEl = range
                .createContextualFragment(formStr)
                .querySelector('form');

            document.querySelector('.form-header').after(formEl);

            if (brandImage != null && !brandImage.complete) {
                brandImage.addEventListener('load', () => {
                    initializeForm(formEl);
                });
                brandImage.addEventListener('error', () => {
                    initializeForm(formEl);
                });
            } else {
                initializeForm(formEl);
            }
        } catch (error) {
            // eslint-disable-next-line no-alert
            config.alertMethod(
                `Error fetching form from enketo-transformer at:
                ${transformerUrl}.\n\nPlease check that enketo-transformer has been started.
                ${error.message ?? error}`
            );

            throw error;
        }
    })();
} else if ((formEl = document.querySelector('form.or'))) {
    document.querySelector('.guidance').remove();
    modelStr = window.globalModelStr;
    initializeForm(formEl);
} else {
    document
        .querySelectorAll('.form-header, .form-footer')
        .forEach((element) => {
            element.classList.add('hide');
        });

    (async () => {
        const localForms = (await import(`./${'forms'}.mjs`)).default;
        const guidance = document.querySelector('.guidance');
        guidance.innerHTML = '<p>Local test forms:</p><ul></ul>';
        const list = guidance.querySelector('ul');
        const formNames = Array.from(Object.keys(localForms)).sort((a, b) => {
            if (a.includes('/')) {
                return 1;
            }
            return b.includes('/') ? -1 : 0;
        });

        formNames.forEach((name) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            const url = new URL('/', window.location.href);
            url.searchParams.set('xform', name);
            url.searchParams.set('excludeNonRelevant', true);
            link.href = url.href;
            link.textContent = name;
            item.append(link);
            list.append(item);
        });
        document.querySelector('.guidance').classList.remove('hide');
    })();
}

// validate handler for validate button
document.querySelector('#validate-form').addEventListener('click', () => {
    // validate form
    form.validate().then((valid) => {
        if (!valid) {
            config.alertMethod(
                'Form contains errors. Please see fields marked in red.'
            );
        } else {
            config.alertMethod(
                'Form is valid! (see XML record and media files in the console)'
            );
            form.view.html.dispatchEvent(events.BeforeSave());
            console.log('record:', form.getDataStr());
            console.log('media files:', fileManager.getCurrentFiles());
        }
    });
});

// initialize the form
function initializeForm(formEl) {
    const formProgress = document.querySelector('.form-progress');

    // Currently copied from Enketo Express
    document.addEventListener(events.ProgressUpdate().type, (event) => {
        if (
            event.target.classList.contains('or') &&
            formProgress &&
            event.detail
        ) {
            formProgress.style.width = `${event.detail}%`;
        }
    });

    modelStr = modelStr ?? window.globalModelStr;
    form = new Form(
        formEl,
        {
            modelStr,
        },
        {
            printRelevantOnly: false,
        }
    );
    // for debugging
    window.form = form;
    // initialize form and check for load errors
    const loadErrors = form
        .init()
        .filter((error) => error !== "Can't find last-saved.");

    if (loadErrors.length > 0) {
        console.log(`loadErrors: `, ...loadErrors);
    }

    // Setting document title is helpful when testing multiple forms in different tabs
    document.title =
        formEl.querySelector('#form-title')?.textContent ?? document.title;
}

// get query string parameter
function getURLParameter(name) {
    return decodeURI(
        (new RegExp(`${name}=` + `(.+?)(&|$)`).exec(location.search) || [
            null,
            null,
        ])[1]
    );
}

// to facilitate developing print-specific issues
function printView(on = true, grid = false) {
    if (on) {
        document
            .querySelectorAll('.question')
            .forEach((el) => el.dispatchEvent(events.Printify()));
        styleToAll();
        if (grid) {
            fixGrid({ format: 'letter' }).then(() => console.log('done'));
        }
    } else {
        document
            .querySelectorAll('.question')
            .forEach((el) => el.dispatchEvent(events.DePrintify()));
        styleReset();
    }
}

window.printGridView = (on = true) => printView(on, true);
window.printView = printView;
