import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class PinkButtonElement extends LitElement {

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
            
            <button @click=${() => {console.log("You clicked on the pink button!")}}>
                <slot></slot>
            </button>
        `;
    }  
}

customElements.define('pink-button', PinkButtonElement);