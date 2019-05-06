import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class HeaderElement extends LitElement {

    static get properties() {
        return {
          	title: {type: String}
        }
    }
  
  	constructor() {
    	super()
      	this.title = "Page Title"
    }

    render() {
        return html`
            <style>
				:host {
					width: 100%;
				}
                #header {
					display: grid;
					grid-auto-flow: column;
					justify-content: space-between;
					align-items: center;
					height: 60px;
					width: 100%;
					padding-left: 20px;
					padding-right: 20px;
					background: grey;
					color: white;
				}
				#title {
					font-weight: bolder;
					font-size: 1.3em;
				}

            </style>
            
        	<div id="header">
				<span id="title">${this.title}</span>
				<slot id="children"></slot>
			</div>
        `;
    }  
}

customElements.define('lit-sink-header', HeaderElement);