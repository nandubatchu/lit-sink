import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class RedButtonElement extends LitElement {

    static get properties() {
        return {}
    }

    render() {
        return html`
            <style>
                button {
                    background: red;
                }
            </style>
            
            <button @click=${() => {console.log("You clicked on the pink button!")}}>
                <slot></slot>
            </button>
        `;
    }  
}

customElements.define('red-button', RedButtonElement);