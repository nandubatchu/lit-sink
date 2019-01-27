import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class MyElement extends LitElement {

    static get properties() {
        return {
            mood: {type: String}
        }
    }

    render() {
        return html`
            <style>
                button {
					background: green;
				}
            </style>
            
        	<button @click=${()=> {console.log('here')}}>Here <slot></slot></button>
        `;
    }  
}

customElements.define('my-element', MyElement);


























