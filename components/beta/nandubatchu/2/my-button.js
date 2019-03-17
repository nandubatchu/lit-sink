import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
import 'https://cdn.jsdelivr.net/gh/nandubatchu/lit-sink@f34c53b/components/beta/nandubatchu/0/pink-button.js';

class ButtonElement extends LitElement {

    static get properties() {
        return {}
    }

    render() {
        return html`
            <style>
                button {
                    background: pink;
                }
            </style>
            
            <div @click=${() => {console.log("You clicked on the pink button!")}}>
				Testing my button component
                <pink-button>Test</pink-button>
            </div>
        `;
    }  
}

customElements.define('my-button', ButtonElement);