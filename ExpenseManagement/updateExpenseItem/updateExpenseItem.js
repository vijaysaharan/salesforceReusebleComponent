import { LightningElement, track, api } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import fileuploadcustomCSS from '@salesforce/resourceUrl/fileuploadcustomCSS';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPicklistOptions from '@salesforce/apex/UpdateExpenseItemController.getPicklistOptions';
import getExpenseLabelOptions from '@salesforce/apex/UpdateExpenseItemController.getExpenseLabelOptions';
import expenseListForVisit from '@salesforce/apex/UpdateExpenseItemController.expenseListForVisit';
import deleteExpenseRecord from '@salesforce/apex/UpdateExpenseItemController.deleteExpenseRecord';
import getPricePolicyDetail from '@salesforce/apex/UpdateExpenseItemController.getPricePolicyDetail';
import getFromPlaceAndToPlace from '@salesforce/apex/UpdateExpenseItemController.getFromPlaceAndToPlace';
import createExpenseDataWithAttachment from '@salesforce/apex/UpdateExpenseItemController.createExpenseDataWithAttachment';

export default class UpdateExpenseItem extends LightningElement {
    @api recordId;
    @api visitId;

    fakeId = 0;

    @track isAddExpense = true;

    @track customerExpenseData;

    @track fakeIdsListForUpdate = [];
    @track mapfakeIdMap = {};
    ExpenseModeOptions;
    LabelPickListOptions;
    StatePickList;
    TravelPriceList;

    recordLabelList = [];
    recordValueList = [];
    requiredOrder = [];

    emptyList = false;

    isRecordPageSelected = true;
    SelectedRecordPage = null;
    travelList;
    lodgingList;
    boardingList;
    miscellaneousList;

    options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };

    get acceptedFormats(){
        return ['.pdf'];
    }


    RecordPageOptions = [
        { label: 'Travel', value: 'Travel' },
        { label: 'Lodging', value: 'Lodging' },
        { label: 'Boarding', value: 'Boarding' },
        { label: 'Miscellaneous', value: 'Miscellaneous' }
    ];

    connectedCallback() {
        Promise.all([
            loadStyle(this, fileuploadcustomCSS)
        ]).then(() => {
            console.log('Upload success')
        }).catch( (error) => {
            console.log(error);
        })
        getExpenseLabelOptions().then(op => {
            this.requiredOrder = op.recordNameOrder;
            this.LabelPickListOptions = op.pickList.map(el => {
                return { label: el.Label, value: el.Value };
            });
            
            this.LabelPickListOptions = this.sortPicklistData(this.LabelPickListOptions);
            this.recordLabelList = this.LabelPickListOptions.map(l => l.label);
            this.recordValueList = this.LabelPickListOptions.map(l => l.value);

            expenseListForVisit({ evtId: this.recordId }).then(exp => {
                var expenseCustomerList = JSON.parse(JSON.stringify(exp));
                this.customerExpenseData = expenseCustomerList;
                if (exp.length > 0) {
                    this.customerExpenseData.forEach((ele) => {
                        if(ele.customerData.Who != undefined && ele.customerData.Who != null){
                            ele.customerData.customerName = ele.customerData.Who.Name;
                        }
                        if (ele.customerData.Check_In_time__c != undefined) {
                            ele.customerData.CheckInTime = new Intl.DateTimeFormat('en-US', this.options).format(new Date(ele.customerData.Check_In_time__c));
                            ele.customerData.CheckInDate = this.convertToDateFormate(ele.customerData.Check_In_time__c);
                        }
                        if (ele.customerData.Check_Out_Time__c != undefined) {
                            ele.customerData.CheckOutTime = new Intl.DateTimeFormat('en-US', this.options).format(new Date(ele.customerData.Check_Out_Time__c));
                            ele.customerData.CheckOutDate = this.convertToDateFormate(ele.customerData.Check_Out_Time__c);
                        }
                        ele.expenseDataList = ele.expenseDataList.map((el) => {
                            const recordTypeId = el.RecordTypeId;
                            let recordPage, isLodging, isBoarding, isTravel, isMiscellaneous;
                            
                            if (recordTypeId === this.recordValueList[1]) {
                                recordPage = 'Lodging';
                                isLodging = true;
                            } else if (recordTypeId === this.recordValueList[2]) {
                                recordPage = 'Boarding';
                                isBoarding = true;
                            } else if (recordTypeId === this.recordValueList[0]) {
                                recordPage = 'Travel';
                                isTravel = true;
                            } else {
                                recordPage = 'Miscellaneous';
                                isMiscellaneous = true;
                            }
                            
                            return {
                                ...el,
                                isLodging: !!isLodging,
                                isBoarding: !!isBoarding,
                                isTravel: !!isTravel,
                                isMiscellaneous: !!isMiscellaneous,
                                isTravelModeAuto: false,
                                recordPage,
                                fakeId: this.fakeId++,
                                forUpdate: true
                            };
                        });
                    });
                    this.mergeExpensesByRecordPage();
                } else {
                    this.emptyList = true;
                    //this.showToast('No Data Found', 'For this visit there is no expense or your customer connect not checkin. ', 'warning');
                }
            }).catch(err => {
                this.showToast('Error', 'Error In Visit Expense Data : ' + JSON.stringify(err.body.message), 'error');
            });
        }).catch(err => {
            this.showToast('Error', 'Error In Getting Record Pages Data : ' + JSON.stringify(err.body.message), 'error');
        });

        getPicklistOptions({ objectName: 'ExpenseItem__c', fieldName: 'State_Name__c' }).then(data => {
            this.StatePickList = data.map(option => {
                return { label: option, value: option };
            });
        }).catch(err => {
            this.showToast('Error', 'Error In Getting Picklist Data : ' + JSON.stringify(err.body.message), 'error');
        });

        getPricePolicyDetail({ evtId: this.recordId }).then(data => {
            this.TravelPriceList = JSON.parse(JSON.stringify(data));
            getPicklistOptions({ objectName: 'ExpenseItem__c', fieldName: 'Mode__c' }).then(data => {
                this.ExpenseModeOptions = data.map(option => {
                    return { label: option, value: option };
                });
                if(this.TravelPriceList.TwoWheelerEntitlement__c == 0){
                    this.ExpenseModeOptions = this.ExpenseModeOptions.filter(mod => mod.label != 'Two wheeler');
                }
                if(this.TravelPriceList.FourWheelerEntitlement__c == 0){
                    this.ExpenseModeOptions = this.ExpenseModeOptions.filter(mod => mod.label != 'Four wheeler');
                }
                if(this.TravelPriceList.FourWheelerEntitlement__c == 0 && this.TravelPriceList.TwoWheelerEntitlement__c == 0){
                    this.ExpenseModeOptions = this.ExpenseModeOptions.filter(mod => mod.label != 'Four wheeler' && mod.label != 'Two wheeler');
                }
            }).catch(err => {
                this.showToast('Error', 'Error In Getting Picklist Data : ' + JSON.stringify(err.body.message), 'error');
            });
        }).catch(err => {
            this.showToast('Error', 'Error In Getting Price Data : ' + JSON.stringify(err.body.message), 'error');
            getPicklistOptions({ objectName: 'ExpenseItem__c', fieldName: 'Mode__c' }).then(data => {
                this.ExpenseModeOptions = data.map(option => {
                    return { label: option, value: option };
                });
                this.ExpenseModeOptions = this.ExpenseModeOptions.filter(mod=> mod.label != 'Four wheeler' && mod.label != 'Two wheeler');
            }).catch(err => {
                this.showToast('Error', 'Error In Getting Picklist Data : ' + JSON.stringify(err.body.message), 'error');
            });
        });
    }

    handleAddExpense(event) {
        var customerToAddExpense = event.currentTarget.dataset.id;
        var selectedRecordPage = event.currentTarget.dataset.page;
        var selectedCustomerIndex = this.customerExpenseData.findIndex(ele => ele.customerData.Id == customerToAddExpense);
        var selectedRecordPageIndex = this.customerExpenseData[selectedCustomerIndex]['expenseDataList'].findIndex(ele => ele.PageName == selectedRecordPage);
        if (selectedCustomerIndex != -1) {
            var whoId = this.customerExpenseData[selectedCustomerIndex]['customerData'].WhoId;
            var checkForLead = whoId && whoId.length >= 3 && whoId.substring(0, 3) === '00Q';
            var checkForContact = whoId && whoId.length >= 3 && whoId.substring(0, 3) === '003';
            var customerRecId = this.customerExpenseData[selectedCustomerIndex]['customerData'].Id;
            var fromdateFromCustomer = this.customerExpenseData[selectedCustomerIndex]['customerData'].ActivityDate;
            var ownerIdFromCustomer = this.customerExpenseData[selectedCustomerIndex]['customerData'].OwnerId;
            var recordPageId = event.currentTarget.dataset.name;
            var newExpense = {
                fakeId: this.fakeId++,
                forUpdate: false,
                isTravelCustom: false,
                isTravelModeAuto: false,
                isLodging: selectedRecordPage === 'Lodging',
                recordPage: selectedRecordPage,
                isBoarding: selectedRecordPage === 'Boarding',
                isMiscellaneous: selectedRecordPage === 'Miscellaneous',
                isTravel: selectedRecordPage === 'Travel',
                ReferanceID__c: this.customerExpenseData[selectedCustomerIndex]['customerData'].MeetingID__c,
                Mode__c: null,
                Description__c: null,
                Expense__c: this.visitId,
                //Expense__c : 'a2C5i000000Ao9OEAS',
                From__c: '',
                To__c: '',
                RecordTypeId: recordPageId,
                From_Date__c: fromdateFromCustomer,
                To_Date__c: null,
                No_of_Days__c: null,
                State_Name__c: null,
                City_Name__c: null,
                HotelLodgeName__c: null,
                Bill_No__c: null,
                Paticulars__c: null,
                Distance__c: null,
                Lead__c : null,
                Contact__c : null,
                Approved_Amount__c : null,
                Employee_Name__c: ownerIdFromCustomer,
            }
            if(checkForContact){
                newExpense.Contact__c = this.customerExpenseData[selectedCustomerIndex]['customerData'].WhoId;
            }
            else if(checkForLead){
                newExpense.Lead__c = this.customerExpenseData[selectedCustomerIndex]['customerData'].WhoId;
            }
            if (selectedRecordPage == 'Miscellaneous') {
                newExpense.To_Date__c = fromdateFromCustomer;
            }
            if (selectedRecordPage == 'Travel') {
                newExpense.isTravelCustom = true;
                getFromPlaceAndToPlace({evtId : customerRecId}).then(res=>{
                    newExpense.From__c = res.FromAddress;
                    newExpense.To__c = res.ToAddress;
                    this.customerExpenseData[selectedCustomerIndex]['expenseDataList'][selectedRecordPageIndex]['expenseDataListEach'].push(newExpense);
                    this.fakeIdsListForUpdate.push(newExpense.fakeId);
                }).catch(err=>{
                    console.log('Error==>'+JSON.stringify(err));
                });
            }
            else{
                this.customerExpenseData[selectedCustomerIndex]['expenseDataList'][selectedRecordPageIndex]['expenseDataListEach'].push(newExpense);
                this.fakeIdsListForUpdate.push(newExpense.fakeId);
            }
        }
    }

    handleExpenseChange(event) {
        var multiselectvalue = event.detail.value;
        var selectedChangePage = event.currentTarget.dataset.page;
        var idChanged = event.currentTarget.dataset.id;
        this.fakeIdsListForUpdate.push(parseInt(idChanged));
        var fieldChanged = event.currentTarget.dataset.field;
        var customerChange = event.currentTarget.dataset.name;
        var customerIndexChanged = this.customerExpenseData.findIndex(ele => ele.customerData.Name == customerChange);
        var expenseIndexChanged = this.customerExpenseData[customerIndexChanged]['expenseDataList'].findIndex(ele => ele.PageName == selectedChangePage);
        if (customerIndexChanged != -1) {
            var expenseIdChangeIndex = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'].findIndex(ele => ele.fakeId == idChanged);
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex][fieldChanged] = event.detail.value;
        }
        
        if (fieldChanged == 'Amount__c') {
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = multiselectvalue;
        }
        if(fieldChanged == 'Amount__c' && selectedChangePage == 'Lodging'){
            if(multiselectvalue <= this.TravelPriceList.Lodging_Entitlement__c){
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = multiselectvalue;
            }
            else{
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.TravelPriceList.Lodging_Entitlement__c;
            }
        }

        if (fieldChanged == 'From_Date__c' && selectedChangePage == 'Miscellaneous') {
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['To_Date__c'] = multiselectvalue;
        }

        if ((selectedChangePage == 'Lodging' || selectedChangePage == 'Boarding') && fieldChanged == 'To_Date__c') {
            const toDate = new Date(this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['To_Date__c']);
            const fromDate = new Date(this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['From_Date__c']);
            let numberOfDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
            if (numberOfDays == 0 || numberOfDays < 0) {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['No_of_Days__c'] = 1;
            }
            else {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['No_of_Days__c'] = numberOfDays;
            }
        }

        if(selectedChangePage == 'Boarding'){
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['No_of_Days__c']) * (this.TravelPriceList.Boarding_Entitlement__c);
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'];
        }

        if ((selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue != 'Two wheeler') || (selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue != 'Four wheeler')) {
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['isTravelModeAuto'] = true;
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = 0;
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'];
        }

        if ((selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue == 'Two wheeler') || (selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue == 'Four wheeler')) {
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['isTravelModeAuto'] = false;
        }

        if (selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue == 'Two wheeler') {
            if (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c'] != null) {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c']) * (this.TravelPriceList.TwoWheelerEntitlement__c);
            }
            else {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = 0;
            }
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'];
        }

        if (selectedChangePage == 'Travel' && fieldChanged == 'Mode__c' && multiselectvalue == 'Four wheeler') {
            if (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c'] != null) {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c']) * (this.TravelPriceList.FourWheelerEntitlement__c);
            }
            else {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = 0;
            }
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'];
        }

        if (selectedChangePage == 'Travel' && fieldChanged == 'Distance__c') {
            if ((this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c'] != null) && (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Mode__c'] == 'Two wheeler')) {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c']) * (this.TravelPriceList.TwoWheelerEntitlement__c);
            }
            else if ((this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c'] != null) && (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Mode__c'] == 'Four wheeler')) {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = (this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Distance__c']) * (this.TravelPriceList.FourWheelerEntitlement__c);
            }
            else {
                this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'] = 0;
            }
            this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Approved_Amount__c'] = this.customerExpenseData[customerIndexChanged]['expenseDataList'][expenseIndexChanged]['expenseDataListEach'][expenseIdChangeIndex]['Amount__c'];
        }

    }

    handleDeleteExpense(event) {
        var deleteExpenseId = event.currentTarget.dataset.id;
        var deleteExpensePage = event.currentTarget.dataset.page;
        this.customerExpenseData.forEach((ele) => {
            var deleteRecordPageIndex = ele.expenseDataList.findIndex(ele => ele.PageName == deleteExpensePage);
            var foundRecord = ele.expenseDataList[deleteRecordPageIndex]['expenseDataListEach'].findIndex((el) => el.fakeId == deleteExpenseId);
            if (foundRecord != undefined) {
                let deleteData = ele.expenseDataList[deleteRecordPageIndex]['expenseDataListEach'][foundRecord];
                if (deleteData != undefined) {
                     if (deleteData['Id'] != undefined) {
                        deleteExpenseRecord({ expenseData: deleteData })
                            .then((bool) => {
                                if (bool) {
                                    ele.expenseDataList[deleteRecordPageIndex].expenseDataListEach = ele.expenseDataList[deleteRecordPageIndex].expenseDataListEach.filter((el) => el.fakeId != deleteExpenseId);
                                }
                            })
                            .catch((error) => {
                                this.showToast('Error', 'Error In Deleting Expense : ' + JSON.stringify(error.body.message), 'error');
                            });
                    }
                    ele.expenseDataList[deleteRecordPageIndex].expenseDataListEach = ele.expenseDataList[deleteRecordPageIndex].expenseDataListEach.filter((el) => el.fakeId != deleteExpenseId);
                }
            }
        });
    }

    handleCancelClick() {
        /*
        const closeactionevent = new CustomEvent('closeaction', {
            detail: { 'close': 'close' },
        });
        this.dispatchEvent(closeactionevent); */
        this.isAddExpense = false;
        const event = new CustomEvent('cancel', {
            detail: { value: this.isAddExpense }
        });
        this.dispatchEvent(event);
    }
    
    handleSaveExpense() {
        var setOffakeIds = new Set(this.fakeIdsListForUpdate);
        let listOffakeIds = Array.from(setOffakeIds);
        var ListToUpsert = [];
        var fakeIdToExpenseDataMap = {} ;
        this.customerExpenseData.forEach(ele => {
            ele.expenseDataList.forEach(el => {
                ListToUpsert = ListToUpsert.concat(JSON.parse(JSON.stringify(el.expenseDataListEach)));
            });
        });
        ListToUpsert = ListToUpsert.filter(record => listOffakeIds.includes(record.fakeId));
        if (this.validateAllInputs()) {
            ListToUpsert.forEach(record => {
                let id = record.fakeId;
                delete record.isBoarding;
                delete record.isTravel;
                delete record.isMiscellaneous;
                delete record.isLodging;
                delete record.fakeId;
                delete record.forUpdate;
                delete record.recordPage;
                delete record.isTravelModeAuto;
                delete record.isTravelCustom;
                delete record.PageName;
                delete record.PageId;
                record.sobjectType = 'ExpenseItem__c';
                fakeIdToExpenseDataMap[id]=record;
        });
        createExpenseDataWithAttachment({fakeIdRecordMap : fakeIdToExpenseDataMap,fakeIdsAttachmentMap : this.mapfakeIdMap}).then(res=>{   
            if (res) {
                this.handleCancelClick();
                this.showToast('Upserted', 'Expense record Successfully upserted', 'success');
            }
            else{
                this.handleCancelClick();
            }
        }).catch(err => {
            this.showToast('Error', 'Error In Upserting Expense Data : ' + JSON.stringify(err.body.message), 'error');
        });
        }
        else{
            this.showToast('Field Validation', 'Fill all fields with valid values', 'error');
        }

    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    convertToDateFormate(dateString) {
        let dateObject = new Date(dateString);
        let year = dateObject.getUTCFullYear();
        let month = String(dateObject.getUTCMonth() + 1).padStart(2, '0');
        let day = String(dateObject.getUTCDate()).padStart(2, '0');
        let formattedDate = `${year}-${month}-${day}`;
        return formattedDate;
    }

    mergeExpensesByRecordPage() {
        //const pageNames = ['Travel', 'Lodging', 'Boarding', 'Miscellaneous'];
        const pageNames = this.recordLabelList;
        //const pageNames = [this.recordLabelList[0],this.recordLabelList[3]];
        // const pageIds = [this.travel, this.lodging, this.boarding, this.miscellaneous];
        const pageIds = this.recordValueList;
        //const pageIds = [this.recordValueList[0],this.recordValueList[3]];
        this.customerExpenseData.forEach(ele => {
            let resultMap = {};
            ele.expenseDataList.forEach((el, index) => {
                const obj = {
                    PageName: el.recordPage,
                    PageId: pageIds[index],
                    isTravel: el.isTravel,
                    isLodging: el.isLodging,
                    isMiscellaneous: el.isMiscellaneous,
                    isBoarding: el.isBoarding,
                    ...el
                };
                if (pageNames.includes(el.recordPage)) {
                    if (!resultMap[el.recordPage]) {
                        resultMap[el.recordPage] = [];
                    }
                    resultMap[el.recordPage].push(obj);
                }
            });
            let resultList = pageNames.map((pageName, index) => ({
                PageName: pageName,
                PageId: pageIds[index],
                isMiscellaneous: pageName === 'Miscellaneous' ? true : false,
                isTravel: pageName === 'Travel' ? true : false,
                isBoarding: pageName === 'Boarding' ? true : false,
                isLodging: pageName === 'Lodging' ? true : false,
                expenseDataListEach: resultMap[pageName] || []
            }));
            ele.expenseDataList = resultList;
        });
    }

    handleRecordPageChange(event){
        this.SelectedRecordPage = event.detail.value;
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
        return returnVariable;
    }

    sortPicklistData(data) {
        // const desiredOrder = ['Travel', 'Lodging', 'Boarding', 'Miscellaneous'];
        const desiredOrder = this.requiredOrder;
        return data.sort((a, b) => desiredOrder.indexOf(a.label) - desiredOrder.indexOf(b.label));
    }


    handleUploadFinished(event){
        const currFakeId = event.currentTarget.dataset.id;
        var uploadedFiles = event.detail.files;
        var docList = [];
        uploadedFiles.forEach(file => {
            if (file != undefined) {
                var attachmentId = file.documentId;
                var fileName = file.name;
                docList.push(attachmentId);
            }
        });
        if(docList != null){
            this.fakeIdsListForUpdate.push(parseInt(currFakeId));
            if(this.mapfakeIdMap[currFakeId] == null){
                this.mapfakeIdMap[currFakeId] = docList;
            }
            else{
                this.mapfakeIdMap[currFakeId] = [...this.mapfakeIdMap[currFakeId],docList];
            }
        }
    }

}