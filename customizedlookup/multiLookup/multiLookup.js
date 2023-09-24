import { LightningElement ,api, track} from 'lwc';
// import getOptions from '@salesforce/apex/MultiLookupController.getOptions';

export default class MultiLookup extends LightningElement {
  @api width = 100;
  @api variant = '';
  @api label = '';
  @api name = '';
  @api dropdownLength = 5;
  @api objectName = 'Opportunity';
  @api optionLabel = 'Name';
  @api optionValue = 'Id';
  @api searchField = 'Name';
  searchValue;

  @api options = [];
  @track isOpen = false;
  @track options_ = [];
  @api selectedPills = [];  //seperate from values, because for some reason pills use {label,name} while values uses {label:value}

  rendered = false;
  customStyle='';

  connectedCallback(){
    if(this.options != undefined)
    this.options_ = JSON.parse(JSON.stringify(this.options));
  }

  @api refreshOptions(){
    this.connectedCallback();
  }

  parseOptions(options){
    if (options != undefined && Array.isArray(options)){
      this.options_ = JSON.parse(JSON.stringify(options)).map( (option,i) => {
        option.key = i;
        return option;
      });
    }
  }


  //private called by getter of 'value'
  selectedValues(){
    var values = [];
    this.options_.forEach(function(option) {
      if (option.selected === true) {
        values.push(option.value);
      }
    });
    return values;
  }



  get labelStyle() {
    return this.variant === 'label-hidden' ? ' slds-hide' : ' slds-form-element__label ' ;
  }

  get dropdownOuterStyle(){
    return 'slds-dropdown slds-dropdown_length-'+ this.dropdownLength +' slds-dropdown_fluid';
  }

  get mainDivClass(){
    var style = ' slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ';
    return this.isOpen ? ' slds-is-open ' + style : style;
  }
  get hintText(){
    const selectedCount = this.selectedPills.length;
    if (selectedCount === 0) {
      return "Select seller...";
    } else {
      return `${selectedCount} option${selectedCount > 1 ? 's' : ''} selected`;
    }
  }
  get showOptions(){
    return (this.options_.length > 0);
  }

  openDropdown(){
    // var input = this.template.querySelector(`[data-id="comboBox-input-id"]`);
    var input = this.template.querySelector('lightning-icon');
    let rect = input.getBoundingClientRect();
    let x = rect.left;
    let y = rect.top;
    // this.customStyle = `position: fixed;width: fit-content;top:${y+20}px;left:${x-350}px`
    this.isOpen = true;
  }

  closeDropdown(){
    this.searchValue = '';
    this.isOpen = false;
  }

  /* following pair of functions are a clever way of handling a click outside,
     despite us not having access to the outside dom.
     see: https://salesforce.stackexchange.com/questions/255691/handle-click-outside-element-in-lwc
     I made a slight improvement - by calling stopImmediatePropagation, I avoid the setTimeout call
     that the original makes to break the event flow.
  */
  handleClick(event){
    event.stopImmediatePropagation();
    this.openDropdown();
    window.addEventListener('click', this.handleClose);
  }
  handleClose = (event) => {
    event.stopPropagation();
    this.closeDropdown();
    window.removeEventListener('click', this.handleClose);
  }

  handlePillRemove(event){
    event.preventDefault();
    event.stopPropagation();

    const name = event.detail.item.name;

    this.options_.forEach(function(element) {
      if (element.value === name) {
        element.selected = false;
      }
    });
    this.selectedPills = this.getPillArray();
    this.despatchChangeEvent();

  }

  handleSelectedClick(event) {
    event.preventDefault();
    event.stopPropagation();
  
    const { value, selected, shift } = event.detail;
    console.log(JSON.stringify(event.detail));
  
    if (shift) {
      this.options_ = this.options_.map(option => {
        if (option.value === value) {
          option.selected = selected;
        }
        return option;
      });
    } else {
      const selectedOption = this.options_.find(option => option.value === value);
      if (selectedOption) {
        selectedOption.selected = !selectedOption.selected;
      }
    }
    this.selectedPills = this.getPillArray();
    this.despatchChangeEvent();
  }


  despatchChangeEvent() {
    const eventDetail = {value: this.options_};
    const changeEvent = new CustomEvent('changeoptions', { detail: eventDetail });
    this.dispatchEvent(changeEvent);
  }


  getPillArray(){
    var pills = [];
    this.options_.forEach(function(element) {
      var iterator = 0;
      if (element.selected) {
        pills.push({label:element.label, name:element.value, key: iterator++});
      }
    });
    return pills;
  }

  searchData(event){
    this.searchValue = event.detail.value;
    var selectedList = this.options_.filter(ele => ele.selected).map(ele => ele.value);
    var queryData = {
        objectName : this.objectName,
        optionLabel : this.optionLabel,
        optionValue : this.optionValue,
        searchField : this.searchField,
        searchValue : this.searchValue,
        selectedValues : selectedList
    }
    // getOptions({queryData}).then(optionList => {
    //     this.options_ = this.options_.filter(ele => ele.selected);
    //     if(optionList){
    //         var tempOptions = [...this.options_, ...optionList.filter(ele => !selectedList.includes(ele.value))];
    //         console.log(tempOptions);
    //         this.options_ = JSON.parse(JSON.stringify(tempOptions));
    //         this.openDropdown();
    //     }
    // }).catch(err => {
    //     console.log(err);
    // })
  }
}