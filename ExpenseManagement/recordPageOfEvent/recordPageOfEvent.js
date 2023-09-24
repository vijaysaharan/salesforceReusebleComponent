import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getEventData from '@salesforce/apex/markersController.getEventData';
import checkInEvent from '@salesforce/apex/markersController.checkInEvent';
import checkOutEvent from '@salesforce/apex/markersController.checkOutEvent';
import updateEventDetails from '@salesforce/apex/markersController.updateEventDetails';
import getPicklistOptions from '@salesforce/apex/visitStartAndEndController.getPicklistOptions';

export default class RecordPageOfEvent extends LightningElement {
    @api eventId;
    @api visitId;
    @api customerName;
    @api customerAddress;
    @track isClicked = false;
    @track eventData;
    @track isCheckIn = false;
    @track isCheckOut = false;
    @track isUpdateExpenseClicked = false;

    statusOptionList;

    connectedCallback() {
        getPicklistOptions({ objectName: 'Event', fieldName: 'Status__c' }).then(data=>{
            this.statusOptionList = data.map(option => {
                return { label: option, value: option };
            });
        });
    }

    
    get eventId() {
        return this._eventId;
    }

    set eventId(value) {
        this._eventId = value;
        this.fetchEventData();
    }

    fetchEventData() {
        this.isUpdateExpenseClicked = false;
        if (this.eventId) {
            getEventData({ eventId: this.eventId })
                .then(data => {
                    if (data) {
                        this.eventData = JSON.parse(JSON.stringify(data));
                        if(this.eventData.Check_In_time__c != undefined && this.eventData.Check_In_time__c != null){
                            this.isCheckIn = false;
                        }
                        else if(this.eventData.Check_In_time__c == undefined){
                            this.isCheckIn = true;
                        }
                        if(this.eventData.Owner.Name != undefined && this.eventData.Owner.Name != null){
                            this.eventData.assignedToName = this.eventData.Owner.Name;
                        }
                        if(this.eventData.Who.Name != undefined && this.eventData.Who.Name != null){
                            this.eventData.customerName = this.eventData.Who.Name;
                        }
                        else{
                            this.eventData.customerName = null;
                        }
                        if(this.eventData.Check_Out_Time__c != undefined && this.eventData.Check_Out_Time__c != null && !this.isCheckIn){
                            this.isCheckOut = false;
                        }
                        else if(this.eventData.Check_Out_Time__c == undefined && !this.isCheckIn){
                            this.isCheckOut = true;
                        }
                        else if(this.eventData.Check_Out_Time__c == undefined && this.isCheckIn){
                            this.isCheckOut = false;
                        }
                        if(this.eventData.StartDateTime != undefined){
                            const startDateTime = new Date(this.eventData.StartDateTime);
                            this.eventData.startTime = this.getFormattedDateTime(startDateTime);
                        }
                        if(this.eventData.EndDateTime != undefined){
                            const startDateTime = new Date(this.eventData.EndDateTime);
                            this.eventData.endTime = this.getFormattedDateTime(startDateTime);
                        }
                        if(this.eventData.WhatId != undefined && this.eventData.What.Name != undefined && this.eventData.What.Name != null){
                            this.eventData.relatedName = this.eventData.What.Name;
                        }
                        else{
                            this.eventData.relatedName = '';
                        }
                        this.isClicked = true;
                    }
                })
                .catch(error => {
                    console.error(JSON.stringify(error));
                });
        }
    }

    handleEventInputChange(event){
        var currField = event.currentTarget.dataset.field
        var currValue = event.detail.value;

        this.eventData[currField] = currValue;
    }

    handleCancelClick(){
        var falseVal = false;
        const event = new CustomEvent('cancel', {
            detail: { value: falseVal }
        });
        this.dispatchEvent(event);
    }

    handleSaveClick(){
        if(this.validateAllInputs()){
            var eventDataToUpdate = JSON.parse(JSON.stringify(this.eventData));
            delete eventDataToUpdate.assignedToName;
            delete eventDataToUpdate.customerName;
            delete eventDataToUpdate.startTime;
            delete eventDataToUpdate.endTime;
            delete eventDataToUpdate.relatedName;
            updateEventDetails({eventDetails : eventDataToUpdate}).then(res=>{
                if(res){
                    this.showToast('Event Details Saved!','Your filled details are saved.','success','dismissable');
                    this.handleCancelClick();
                }
            }).catch(err=>{
                this.showToast('Error In Save Event Details!','Error- '+JSON.stringify(err.body),'error','dismissable');
            });
        }
    }

    handleCheckIn(){
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                if (this.eventId != null) {
                    checkInEvent({latitude : latitude, longitude : longitude, eventId : this.eventId}).then(res=>{
                        this.showToast('Check In Successfull','Succesfully check in!','success','dismissable');
                        this.isCheckIn = false;
                        this.isCheckOut = true;
                    }).catch(err=>{
                        this.showToast('Check In Error', 'Error In CheckIn - '+JSON.stringify(err), 'error', 'dismissable');
                    });
                }
            });
        }
        else{
            this.showToast('Warnnig', 'Please ensure location services are enabled and connectivity is available!', 'error', 'dismissable');                
        }
    }

    handleCheckOut(){
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                if (this.eventId != null) {
                    checkOutEvent({latitude : latitude, longitude : longitude, eventId : this.eventId}).then(res=>{
                        this.showToast('Check Out Successfull','Succesfully check out!','success','dismissable');
                        this.isCheckIn = false;
                        this.isCheckOut = false;
                    }).catch(err=>{
                        this.showToast('Check Out Error', 'Error In Check Out - '+JSON.stringify(err), 'error', 'dismissable');
                    });
                }
            });
        }
        else{
            this.showToast('Warnnig', 'Please ensure location services are enabled and connectivity is available!', 'error', 'dismissable');                
        }
    }

    showToast(title, message, variant, mode) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: mode
        });
        this.dispatchEvent(event);
    }

    getFormattedDateTime(originalDateTime){
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        };
    
        const formatter = new Intl.DateTimeFormat('en-IN', options);
        const formattedDateTime = formatter.format(originalDateTime);
        return formattedDateTime;
    }

    validateAllInputs() {
        var returnVariable = true;
        var inputList = this.template.querySelectorAll('lightning-input');
        for (let index = 0; index < inputList.length; index++) {
            const element = inputList[index];
            var validateElement = element.reportValidity();
            if (!validateElement) {
                returnVariable = false;
            }
        }
        var comboList = this.template.querySelectorAll('lightning-combobox');
        for (let index = 0; index < comboList.length; index++) {
            const element = comboList[index];
            var validateElement = element.reportValidity();
            if (!validateElement) {
                returnVariable = false;
            }
        }
        var textAreaList = this.template.querySelectorAll('lightning-textarea');
        for (let index = 0; index < textAreaList.length; index++) {
            const element = textAreaList[index];
            var validateElement = element.reportValidity();
            if (!validateElement) {
                returnVariable = false;
            }
        }
        return returnVariable;
    }

    handleAddExpense(){
        this.isClicked = false;
        this.isUpdateExpenseClicked = true;
    }

    handleCancelOfUpdateExpense(event){
        this.isUpdateExpenseClicked = event.detail.value;
        if(!this.isUpdateExpenseClicked){
            this.isClicked = true;
        }
    }
}