public with sharing class UpdateExpenseItemController {
    @AuraEnabled
    public static List<String> getPicklistOptions(String objectName, String fieldName) {
        List<String> options = new List<String>();
        Schema.DescribeSObjectResult describeResult = Schema.getGlobalDescribe().get(objectName).getDescribe();
        Schema.DescribeFieldResult fieldDescribe = describeResult.fields.getMap().get(fieldName).getDescribe();
        List<Schema.PicklistEntry> picklistValues = fieldDescribe.getPicklistValues();
        for (Schema.PicklistEntry picklistEntry : picklistValues) {
            options.add(picklistEntry.getValue());
        }
        return options;
    }
    
    @AuraEnabled
    public static nameOrder getExpenseLabelOptions() {
        nameOrder returnData = new nameOrder();
        List<labelOptions> labelPicklist = new List<labelOptions>();
        List<String> recordPageNameOrder = Label.expenseRecordPageNamesOrder.split(';');
        List<RecordType> recTyp = [Select Id, Name, DeveloperName, SobjectType, IsActive from RecordType Where SobjectType = 'ExpenseItem__c' And IsActive = true];
        for(RecordType rec : recTyp){
            labelOptions option = new labelOptions();
            option.Label = rec.DeveloperName;
            option.Value = rec.Id;
            labelPicklist.add(option);
        }
        returnData.recordNameOrder = recordPageNameOrder;
        returnData.pickList = labelPicklist;
        return returnData;
    }
    
    public class labelOptions{
        @AuraEnabled public String Label{get;set;}
        @AuraEnabled public String Value{get;set;}
    }
    
    public class nameOrder{
        @AuraEnabled public List<String> recordNameOrder{get;set;}
        @AuraEnabled public List<labelOptions> pickList{get;set;}
    }
    
    @AuraEnabled
    public static List<returnMap> expenseListForVisit(Id evtId){
        List<returnMap> mapOfExpense = new List<returnMap>();
        List<Event> evtData = [Select Id,Location,Owner.Name,What.Name, Subject,IsAllDayEvent,EndDateTime,StartDateTime,WhatId,EventSubtype,Type,OwnerId, WhoId,ActivityDateTime,ActivityDate,Status__c, Description,MeetingID__c,Check_In_Address__c, Check_In_time__c, Check_Out_Address__c, Check_In_Location__Latitude__s, Check_In_Location__Longitude__s, Check_Out_Location__Latitude__s, Check_Out_Time__c, Who.Name   from Event Where Type = 'Meeting' And Id=:evtId];
        if(!evtData.isEmpty()){
            List<ExpenseItem__c> expenseListForVisit = [Select Id,RecordTypeId,To__c,From__c,Employee_Name__c,From_Date__c,To_Date__c,No_of_Days__c,State_Name__c,City_Name__c,HotelLodgeName__c,Bill_No__c,Paticulars__c,Distance__c,Amount__c,Expense__c,Mode__c,Description__c,ReferanceID__c From ExpenseItem__c Where  ReferanceID__c =:evtData[0].MeetingID__c];    
            Map<String,List<ExpenseItem__c>> evtIdExpenseMap = new Map<String,List<ExpenseItem__c>>();
        Map<String,Event> evtMap = new Map<String,Event>();
        Set<String> evtIds = new Set<String>();
        for(ExpenseItem__c exp : expenseListForVisit){
            evtIds.add(exp.ReferanceID__c);
            if(evtIdExpenseMap.containsKey(exp.ReferanceID__c)){
                evtIdExpenseMap.get(exp.ReferanceID__c).add(exp);
            }
            else{
                evtIdExpenseMap.put(exp.ReferanceID__c,new List<ExpenseItem__c>{ exp });
            }
        }
        for(Event evt : evtData){
            evtMap.put(evt.MeetingID__c ,evt);
            if(evtIdExpenseMap.containsKey(evt.MeetingID__c)){
            }
            else{
                evtIdExpenseMap.put(evt.MeetingID__c,new List<ExpenseItem__c> {});
            }
        }
        for(String meetingId : evtIdExpenseMap.keySet()){
            returnMap mp = new returnMap();
            mp.customerData = evtMap.get(meetingId);
            mp.expenseDataList = evtIdExpenseMap.get(meetingId);
            mapOfExpense.add(mp);
        }
        SYstem.debug(mapOfExpense);
        }   
        return mapOfExpense;
    }
    
    @AuraEnabled
    public static Travel_Policy__c getPricePolicyDetail(Id evtId){
        try{
            Event evtData = [Select Id,ActivityDate From Event Where Id =: evtId];
            Expense__c visitData = [Select Id, Employee_Name__c From Expense__c Where Visit_Date__c =:evtData.ActivityDate];
            User uData = [Select Id,Grade__c From User Where Id =: visitData.Employee_Name__c];
            Travel_Policy__c travelPriceData = [Select Id, Name, TwoWheelerEntitlement__c, FourWheelerEntitlement__c, Boarding_Entitlement__c, Lodging_Entitlement__c From Travel_Policy__c Where Name =:uData.Grade__c];
            if(travelPriceData != Null){
                return travelPriceData;
            }
            return new Travel_Policy__c();
        }catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    public class returnMap{
        @AuraEnabled public Event customerData{get;set;}
        @AuraEnabled public List<ExpenseItem__c> expenseDataList{get;set;}
    }
    
    @AuraEnabled 
    public static Boolean deleteExpenseRecord(ExpenseItem__c expenseData){
        if(expenseData != Null){
            delete expenseData;
            return true;
        }
        return false;
    }
    
    @AuraEnabled 
    public static returnToAndFrom getFromPlaceAndToPlace(Id evtId){
        returnToAndFrom returnData = new returnToAndFrom();
        Event currEvent = [Select Id,Location,Owner.Name,What.Name, Subject,IsAllDayEvent,EndDateTime,StartDateTime,WhatId,EventSubtype,Type,OwnerId, WhoId,ActivityDateTime,ActivityDate,Status__c, Description,MeetingID__c,Check_In_Address__c, Check_In_time__c, Check_Out_Address__c, Check_In_Location__Latitude__s, Check_In_Location__Longitude__s, Check_Out_Location__Latitude__s, Check_Out_Time__c, Who.Name   from Event Where Type = 'Meeting' And Id=:evtId];
        List<Expense__c> visitData = [Select Id,Source_Address__c,Employee_Name__c,Visit_Start_DateTime__c,Visit_End_DateTime__c,Visit_Date__c,Source_Geo_Coordinate__Latitude__s,Source_Geo_Coordinate__Longitude__s From Expense__c Where Visit_Date__c =: currEvent.ActivityDate];
        List<Event> evtList = [Select Id,Location,Owner.Name,What.Name, Subject,IsAllDayEvent,EndDateTime,StartDateTime,WhatId,EventSubtype,Type,OwnerId, WhoId,ActivityDateTime,ActivityDate,Status__c, Description,MeetingID__c,Check_In_Address__c, Check_In_time__c, Check_Out_Address__c, Check_In_Location__Latitude__s, Check_In_Location__Longitude__s, Check_Out_Location__Latitude__s, Check_Out_Time__c, Who.Name   from Event WHERE ActivityDate = :currEvent.ActivityDate And Check_In_Time__c != Null And OwnerId =:currEvent.OwnerId Order By Check_In_Time__c];
        returnData.ToAddress = currEvent.Check_In_Address__c;
        Integer index = 0;
        for (Integer i = 0; i < evtList.size(); i++) {
            if (evtList[i].Id == evtId) {
                index = i;
                break; 
            }
        }
        if(index == 0 && !visitData.isEmpty()){
            returnData.FromAddress = visitData[0].Source_Address__c;
        }
        else{
            returnData.FromAddress = evtList[index-1].Check_In_Address__c;
        }
        
        return returnData;
    }
    
    public class returnToAndFrom{
        @AuraEnabled public String FromAddress{get;set;}
        @AuraEnabled public String ToAddress{get;set;}
    }
    
    @AuraEnabled
    public static Boolean createExpenseDataWithAttachment(Map<String, ExpenseItem__c> fakeIdRecordMap, Map<String, List<String>> fakeIdsAttachmentMap) {
        Boolean returnVal = false;
        Map<String, ExpenseItem__c> mapOfExpense = new Map<String, ExpenseItem__c>();
        Map<String, List<String>> mapOfAttachments = new Map<String, List<String>>();
        if(!fakeIdRecordMap.isEmpty()){
            mapOfExpense = fakeIdRecordMap;
        }
        if(!fakeIdsAttachmentMap.isEmpty()){
            mapOfAttachments = fakeIdsAttachmentMap;
        }
        if(fakeIdsAttachmentMap.isEmpty() && fakeIdRecordMap.isEmpty()){
            returnVal = true;
        }
        List<ContentDocumentLink> ContentDocumentLinkList = new List<ContentDocumentLink>(); 

        if(mapOfExpense != null && !mapOfExpense.values().isEmpty()){
            upsert mapOfExpense.values();
            if(fakeIdsAttachmentMap.isEmpty()){
                returnVal = true;
            }
        }
        if(!mapOfAttachments.isEmpty()){
            for(String fakeId : mapOfAttachments.keySet()){
                if(mapOfAttachments.get(fakeId) != null && mapOfAttachments.get(fakeId).size()>0){
                    for(String each : mapOfAttachments.get(fakeId)){
                        ContentDocumentLink newCd = new ContentDocumentLink();
                        newCd.ShareType = 'V';
                        newCd.ContentDocumentId = each;
                        if(mapOfExpense.get(fakeId) != null && mapOfExpense.get(fakeId).Id != null){
                            newCd.LinkedEntityId = mapOfExpense.get(fakeId).Id;
                        }
                        ContentDocumentLinkList.add(newCd);
                    }
                }
            }
        }
        
        if(!ContentDocumentLinkList.isEmpty()){
            insert ContentDocumentLinkList;
            returnVal = true;
        }
        return returnVal;
    }
}