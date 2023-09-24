import { LightningElement,track } from 'lwc';
import mapMarkerData from '@salesforce/apex/markersController.mapMarkerData';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import checkForButton from '@salesforce/apex/visitStartAndEndController.checkForButton';
import createTodaysVisit from '@salesforce/apex/visitStartAndEndController.createTodaysVisit';
import endTodaysVisit from '@salesforce/apex/visitStartAndEndController.endTodaysVisit';
import getPicklistOptions from '@salesforce/apex/visitStartAndEndController.getPicklistOptions';
import getTravelPriceForCurrentUser from '@salesforce/apex/visitStartAndEndController.getTravelPriceForCurrentUser';

export default class JourneyTabDetails extends NavigationMixin(LightningElement) {
    @track selectedMarkerValue;
    @track center;
    @track mapMarkers = [];

    @track todayTime;
    @track currentTime;
    @track secondCount;

    @track askForPlace = false;
    @track isHomeSelected = false;
    @track AllFilled = true;
    @track mapHaveData = false;

    @track isDetailVisible = false;
    @track evtId;
    @track customerName;
    @track customerAddress;

    @track visitRecordData;

    visitRecordId;
    isVisitEnd = false;
    isVisitStart = false;
    isDisable = false;

    StartPlaceOptions;
    visitModeOptions;
    travelPriceList;

    @track isRun = true;
    

    createVisit = {
        sobjectType: 'Expense__c',
        Visit_Start_DateTime__c: null,
        Visit_End_DateTime__c: null,
        Visit_Date__c: null,
        Source_Geo_Coordinate__Latitude__s: null,
        Source_Geo_Coordinate__Longitude__s: null,
        Destination_Geo_Coordinate__Latitude__s: null,
        Destination_Geo_Coordinate__Longitude__s: null,
        Employee_Name__c: null,
        Remark__c: null,
        Starting_Point__c: 'Office',
        Mode__c : null
    }



    connectedCallback() {
        const today = new Date();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 'July',
            'August', 'September', 'October', 'November', 'December'
        ];
        const month = monthNames[today.getMonth()];
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        const formattedDate = `${month} ${day}, ${year}`;
        const currentDayIndex = today.getDay();
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = daysOfWeek[currentDayIndex];
        this.todayTime = formattedDate + ' ' + currentDay;

        this.updateTime();
        this.intervalId = setInterval(() => {
            this.updateTime();
        }, 1000);

        getPicklistOptions({ objectName: 'Expense__c', fieldName: 'Starting_Point__c' }).then(data => {
            this.StartPlaceOptions = data.map(option => {
                return { label: option, value: option };
            });
        });

        getTravelPriceForCurrentUser().then(priceList=>{
            this.travelPriceList = JSON.parse(JSON.stringify(priceList));
            getPicklistOptions({ objectName: 'Expense__c', fieldName: 'Mode__c' }).then(data => {
                this.visitModeOptions = data.map(option => {
                    return { label: option, value: option };
                });
                if(this.travelPriceList.TwoWheelerEntitlement__c == 0){
                    this.visitModeOptions = this.visitModeOptions.filter(mod => mod.label != 'Two wheeler');
                }
                if(this.travelPriceList.FourWheelerEntitlement__c == 0){
                    this.visitModeOptions = this.visitModeOptions.filter(mod => mod.label != 'Four wheeler');
                }
                if(this.travelPriceList.FourWheelerEntitlement__c == 0 && this.travelPriceList.TwoWheelerEntitlement__c == 0){
                    this.visitModeOptions = this.visitModeOptions.filter(mod => mod.label != 'Four wheeler' && mod.label != 'Two wheeler');
                }
            }).catch(er=>{
                this.showToast('Error', JSON.stringify(er), 'error', 'dismissable');
            });
        }).catch(err=>{
            getPicklistOptions({ objectName: 'Expense__c', fieldName: 'Mode__c' }).then(data => {
                this.visitModeOptions = data.map(option => {
                    return { label: option, value: option };
                });
                this.visitModeOptions = this.visitModeOptions.filter(mod=> mod.label != 'Four wheeler' && mod.label != 'Two wheeler');
            }).catch(err=>{
                this.showToast('Error', JSON.stringify(err), 'error', 'dismissable');
            })
        });

        checkForButton().then(res => {
            if (res != 'visitStart') {
                this.visitRecordId = JSON.parse(JSON.stringify(res));
                this.isVisitEnd = true;
                mapMarkerData().then(data=>{
                    this.mapMarkers = data;
                    if(this.mapMarkers.length == 0){
                        this.mapHaveData = false;
                    }
                    else{
                        this.mapHaveData = true;
                    }
                    this.center = {
                        location: this.mapMarkers[0].location,
                    };
                });
            }
            else {
                this.isVisitStart = true;
            }
        }).catch(e => {
            this.isVisitStart = true;
        });
    }

    handleMarkerSelect(event) {
        this.selectedMarkerValue = event.target.selectedMarkerValue;
        this.evtId = this.selectedMarkerValue;
        this.mapMarkers.forEach(el=>{
            if(el.value == this.evtId){
                this.customerName = el.title;
                this.customerAddress = el.description;
            }
        });
        if(this.isRun){
            this.mapHaveData = false;
            this.isDetailVisible = true;
        }
        this.isRun = true;
        console.log(this.mapHaveData);
        console.log('112121'+this.isDetailVisible);
    }

    handleRecordPageCancel(event){
        this.isDetailVisible = event.detail.value;
        if(!this.isDetailVisible){
            this.mapHaveData = !this.isDetailVisible;
            this.isRun = this.isDetailVisible;
            console.log(this.mapHaveData);
        }
    }

    handlevisitStart() {
        this.isVisitStart = false;
        this.askForPlace = true;
    }

    handleCancelPopup() {
        this.askForPlace = false;
        this.isVisitStart = true;
    }

    handleVisitInputChange(event) {
        var currFeild = event.currentTarget.dataset.field;
        var currValue = event.detail.value;

        this.createVisit[currFeild] = currValue;

        if (currFeild == 'Starting_Point__c' && currValue == 'Home') {
            this.isHomeSelected = true;
            if (this.createVisit.Remark__c != null && this.createVisit.Remark__c != '') {
                this.AllFilled = true;
            }
            else {
                this.AllFilled = false;
            }
        }
        if (currFeild == 'Starting_Point__c' && currValue == 'Office') {
            this.isHomeSelected = false;
            this.createVisit.Remark__c = null;
            this.AllFilled = true;
        }

        if (currFeild == 'Remark__c') {
            if (this.createVisit.Remark__c != null && this.createVisit.Remark__c != '') {
                this.AllFilled = true;
            }
            else {
                this.AllFilled = false;
            }
        }


    }

    handleContinue() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                this.createVisit.Source_Geo_Coordinate__Latitude__s = latitude;
                this.createVisit.Source_Geo_Coordinate__Longitude__s = longitude;
                createTodaysVisit({ visitData: this.createVisit }).then(res => {
                    this.isVisitStart = false;
                    this.isVisitEnd = true;
                    this.visitRecordId = JSON.parse(JSON.stringify(res.Id));
                    this.askForPlace = false;
                    window.location.reload();
                    this.showToast('Initiating the Journey', 'Your journey has been successfully initiated!', 'success', 'Sticky');
                }).catch(err => {
                    this.showToast('Error', 'Error ' + JSON.stringify(err), 'error', 'dismissable');
                });
            });
        }
    }
    handlevisitEnd() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;
                if (this.visitRecordId != null) {
                    endTodaysVisit({ latitude: latitude, longitude: longitude, recordId: this.visitRecordId }).then(res => {
                        this.isVisitEnd = false;
                        this.isVisitStart = true;
                        this.showToast('Concluding the Journey', 'Your journey activities for the day have been officially conclude!', 'success', 'dismissable');
                        this.navigateToVisit(this.visitRecordId);
                    }).catch(err => {
                        this.showToast('Error', 'Error ' + JSON.stringify(err), 'error', 'dismissable');
                    });
                }
            });
        }
        else{
            this.showToast('Warnnig', 'Please ensure location services are enabled and connectivity is available!', 'error', 'dismissable');                
        }
    }

    disconnectedCallback() {
        clearInterval(this.intervalId);
    }

    updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.currentTime = `${hours}:${minutes}`;
        this.secondCount = `:${seconds}`;
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

    navigateToVisit(visitRecId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: visitRecId,
                objectApiName: 'Expense__c',
                actionName: 'view'
            },
        });
    }


}