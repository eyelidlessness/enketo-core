import config from 'enketo/config';
import loadForm from '../helpers/load-form';
import dialog from '../../src/js/fake-dialog';
import events from '../../src/js/event';

describe('calculate functionality', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {boolean} */
    let excludeNonRelevant;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(dialog, 'confirm').resolves(true);

        excludeNonRelevant = false;

        sandbox
            .stub(config, 'excludeNonRelevant')
            .get(() => excludeNonRelevant);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('updates inside multiple repeats when repeats become relevant', () => {
        const form = loadForm('repeat-relevant-calculate.xml');
        form.init();

        // This triggers a form.calc.update with this object: { relevantPath: '/data/rg' };
        form.view.$.find('[name="/data/yn"]')
            .prop('checked', true)
            .trigger('change');

        expect(
            form.model
                .node('/data/rg/row')
                .getElements()
                .map((node) => node.textContent)
                .join(',')
        ).to.equal('1,2,3');
        expect(form.view.$.find('[name="/data/rg/row"]')[0].value).to.equal(
            '1'
        );
        expect(form.view.$.find('[name="/data/rg/row"]')[1].value).to.equal(
            '2'
        );
        expect(form.view.$.find('[name="/data/rg/row"]')[2].value).to.equal(
            '3'
        );
    });

    it('updates inside multiple repeats a repeat is removed and position(..) changes', (done) => {
        const form = loadForm('repeat-relevant-calculate.xml');
        form.init();

        form.view.$.find('[name="/data/yn"]')
            .prop('checked', true)
            .trigger('change');

        // remove first repeat to the calculation in both remaining repeats needs to be updated.
        form.view.html.querySelector('.btn.remove').click();

        setTimeout(() => {
            expect(
                form.model
                    .node('/data/rg/row')
                    .getElements()
                    .map((node) => node.textContent)
                    .join(',')
            ).to.equal('1,2');
            expect(form.view.$.find('[name="/data/rg/row"]')[0].value).to.equal(
                '1'
            );
            expect(form.view.$.find('[name="/data/rg/row"]')[1].value).to.equal(
                '2'
            );
            done();
        }, 650);
    });

    it('updates a calculation for node if calc refers to node filtered with predicate', () => {
        const form = loadForm('count-repeated-nodes.xml');
        form.init();

        const text1 = form.view.html.querySelector(
            'textarea[name="/repeat-group-comparison/REP/text1"]'
        );

        text1.value = ' yes ';
        text1.dispatchEvent(events.Change());

        expect(
            form.view.html.querySelector(
                'input[name="/repeat-group-comparison/count2"]'
            ).value
        ).to.equal('1');
    });

    it('does not calculate questions inside repeat instances created with repeat-count, if the repeat is not relevant', () => {
        const form = loadForm('repeat-count-calculate-irrelevant.xml');
        form.init();

        const calcs = form.model.xml.querySelectorAll('SHD_NO');

        expect(calcs.length).to.equal(3);
        expect(calcs[0].textContent).to.equal('');
        expect(calcs[1].textContent).to.equal('');
        expect(calcs[2].textContent).to.equal('');
    });

    // This is important for OpenClinica, but also reduces unnecessary work. A calculation that runs upon form load and
    // doesn't change a default, or loaded, value doesn't have to populate the form control, as this will be done by setAllVals
    it('does not set the form control value if the calculation result does not change the value in the model', () => {
        const form = loadForm(
            'calc-control.xml',
            '<data><calc>12</calc></data>'
        );

        let counter = 0;
        form.view.html
            .querySelector('[name="/data/calc"]')
            .addEventListener(new events.InputUpdate().type, () => counter++);
        form.init();

        expect(counter).to.equal(0);
    });

    // https://github.com/OpenClinica/enketo-express-oc/issues/404#issuecomment-744743172
    // Checks whether different types of calculations are handled consistently when they become non-relevant
    it('consistently leaves calculated values if they become non-relevant', () => {
        const form = loadForm('relevant-calcs.xml');
        form.init();
        const grp = form.model.xml.querySelector('grp');

        expect(grp.textContent.replace(/\s/g, '')).to.equal('');

        const a = form.view.html.querySelector('input[name="/data/a"]');
        a.value = 'a';
        a.dispatchEvent(events.Change());

        expect(grp.textContent.replace(/\s/g, '')).to.equal('onetwothreefour');

        a.value = '';
        a.dispatchEvent(events.Change());

        expect(grp.textContent.replace(/\s/g, '')).to.equal('onetwothreefour');
    });

    describe('Excluding non-relevant nodes', () => {
        beforeEach(() => {
            excludeNonRelevant = true;
        });

        it('recalculates non-relevant values when they are excluded from calculations', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const grp = form.model.xml.querySelector('grp');

            expect(grp.textContent.replace(/\s/g, '')).to.equal('');

            const a = form.view.html.querySelector('input[name="/data/a"]');

            a.value = 'a';
            a.dispatchEvent(events.Change());

            expect(grp.textContent.replace(/\s/g, '')).to.equal(
                'onetwothreefour'
            );

            a.value = '';
            a.dispatchEvent(events.Change());

            expect(grp.textContent.replace(/\s/g, '')).to.equal('');
        });

        it('recalculates relevant values when they are restored', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const grp = form.model.xml.querySelector('grp');

            expect(grp.textContent.replace(/\s/g, '')).to.equal('');

            const a = form.view.html.querySelector('input[name="/data/a"]');

            a.value = 'a';
            a.dispatchEvent(events.Change());

            expect(grp.textContent.replace(/\s/g, '')).to.equal(
                'onetwothreefour'
            );

            a.value = '';
            a.dispatchEvent(events.Change());
            a.value = 'a';
            a.dispatchEvent(events.Change());

            expect(grp.textContent.replace(/\s/g, '')).to.equal(
                'onetwothreefour'
            );
        });

        it('excludes children of non-relevant parents from calculations', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const child = form.model.xml.querySelector('is-child-relevant');

            expect(child.textContent).to.equal('');

            const setsGroupRelevance = form.view.html.querySelector(
                'input[name="/data/sets-group-relevance"]'
            );
            const setsChildRelevance = form.view.html.querySelector(
                'input[name="/data/sets-child-relevance"]'
            );

            setsGroupRelevance.value = '1';
            setsGroupRelevance.dispatchEvent(events.Change());

            setsChildRelevance.value = '2';
            setsChildRelevance.dispatchEvent(events.Change());

            expect(child.textContent).to.equal('is relevant');

            setsGroupRelevance.value = '';
            setsGroupRelevance.dispatchEvent(events.Change());

            expect(child.textContent).to.equal('');
        });

        it('restores relevance of calculations of children of non-relevant when their parents become relevant', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const child = form.model.xml.querySelector('is-child-relevant');

            expect(child.textContent).to.equal('');

            const setsGroupRelevance = form.view.html.querySelector(
                'input[name="/data/sets-group-relevance"]'
            );
            const setsChildRelevance = form.view.html.querySelector(
                'input[name="/data/sets-child-relevance"]'
            );

            setsGroupRelevance.value = '1';
            setsGroupRelevance.dispatchEvent(events.Change());

            setsChildRelevance.value = '2';
            setsChildRelevance.dispatchEvent(events.Change());

            expect(child.textContent).to.equal('is relevant');

            setsGroupRelevance.value = '';
            setsGroupRelevance.dispatchEvent(events.Change());
            setsGroupRelevance.value = '1';
            setsGroupRelevance.dispatchEvent(events.Change());

            expect(child.textContent).to.equal('is relevant');
        });

        // Note (2022/03/09): this behavior is currently inconsistent with JavaRosa
        it('recalculates when a non-relevant field becomes relevant', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const now = form.model.xml.querySelector('now');
            const initialValue = new Date(now.textContent).getTime();

            expect(Number.isNaN(initialValue)).not.to.be.true;

            const toggleNow = form.view.html.querySelector(
                'input[name="/data/toggle-now"]'
            );

            toggleNow.value = '';
            toggleNow.dispatchEvent(events.Change());
            toggleNow.value = '1';
            toggleNow.dispatchEvent(events.Change());

            const recalculatedValue = new Date(now.textContent).getTime();

            expect(recalculatedValue).to.be.greaterThan(initialValue);
        });

        it('recalculates when a non-relevant group becomes relevant', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const now = form.model.xml.querySelector('now-grouped now');
            const initialValue = new Date(now.textContent).getTime();

            expect(Number.isNaN(initialValue)).not.to.be.true;

            const toggleNow = form.view.html.querySelector(
                'input[name="/data/toggle-now"]'
            );

            toggleNow.value = '';
            toggleNow.dispatchEvent(events.Change());
            toggleNow.value = '1';
            toggleNow.dispatchEvent(events.Change());

            const recalculatedValue = new Date(now.textContent).getTime();

            expect(recalculatedValue).to.be.greaterThan(initialValue);
        });

        it('recalculates becoming relevant after becoming non-relevant', () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const computedByChild =
                form.model.xml.querySelector('computed-by-child');
            const initialValue = computedByChild.textContent;

            expect(initialValue).to.equal('');

            const setsGroupRelevance = form.view.html.querySelector(
                'input[name="/data/sets-group-relevance"]'
            );
            const setsChildRelevance = form.view.html.querySelector(
                'input[name="/data/sets-child-relevance"]'
            );

            setsGroupRelevance.value = '1';
            setsGroupRelevance.dispatchEvent(events.Change());
            setsChildRelevance.value = '2';
            setsChildRelevance.dispatchEvent(events.Change());

            expect(computedByChild.textContent).to.equal('is relevant');

            setsChildRelevance.value = '';
            setsChildRelevance.dispatchEvent(events.Change());

            expect(computedByChild.textContent).to.equal('');

            setsChildRelevance.value = '2';
            setsChildRelevance.dispatchEvent(events.Change());

            expect(computedByChild.textContent).to.equal('is relevant');
        });

        it('restores values set arbitrarily when a node becomes relevant', async () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const assignAnyValue =
                form.model.xml.querySelector('assign-any-value');
            const initialValue = assignAnyValue.textContent;

            expect(initialValue).to.equal('');

            const setsRelevance = form.view.html.querySelector(
                'input[name="/data/sets-assign-any-value-relevance"]'
            );

            setsRelevance.value = '1';
            setsRelevance.dispatchEvent(events.Change());

            const assignAnyValueInput = form.view.html.querySelector(
                'input[name="/data/assign-any-value"]'
            );

            assignAnyValueInput.value = 'any value';
            assignAnyValueInput.dispatchEvent(events.Change());

            expect(assignAnyValue.textContent).to.equal('any value');

            setsRelevance.value = '';
            setsRelevance.dispatchEvent(events.Change());

            expect(assignAnyValue.textContent).to.equal('');

            setsRelevance.value = '1';
            setsRelevance.dispatchEvent(events.Change());

            expect(assignAnyValue.textContent).to.equal('any value');
        });

        it('updates recalculated values in the view', async () => {
            const form = loadForm('relevant-calcs.xml', null);

            form.init();

            const assignAnyValue =
                form.model.xml.querySelector('assign-any-value');
            const initialValue = assignAnyValue.textContent;

            expect(initialValue).to.equal('');

            const setsRelevance = form.view.html.querySelector(
                'input[name="/data/sets-assign-any-value-relevance"]'
            );

            const calculated = form.view.html.querySelector(
                'input[name="/data/calc-by-assign-any-value"]'
            );

            expect(calculated.value).to.equal('');

            setsRelevance.value = '1';
            setsRelevance.dispatchEvent(events.Change());

            const assignAnyValueInput = form.view.html.querySelector(
                'input[name="/data/assign-any-value"]'
            );

            assignAnyValueInput.value = 'any value';
            assignAnyValueInput.dispatchEvent(events.Change());

            expect(calculated.value).to.equal('any value');

            setsRelevance.value = '';
            setsRelevance.dispatchEvent(events.Change());

            expect(calculated.value).to.equal('');

            setsRelevance.value = '1';
            setsRelevance.dispatchEvent(events.Change());

            expect(calculated.value).to.equal('any value');
        });
    });
});
