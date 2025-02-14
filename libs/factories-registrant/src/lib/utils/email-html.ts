import { FactoryCreationDTO } from '../dto/factory-creation.dto';
import {
    countriesInEnglish,
    domainsInEnglish,
    typesInEnglish,
    companySizesInEnglish,
} from '../constants/factory-creation';

export const htmlForEmail = (data: FactoryCreationDTO): string => {
    return `    
    <h1>PISTIS Admin Console</h1>
    <h2>Your factory for ${data.organizationName} has been created.</h2>
    <br/>
    <br/>
    <p>Hello, ${data.adminFirstName}! Your factory has successfully been created.</p>
    <p>Here are the details of your factory:</p>
    <ul>
      <li>Organization Name: <b>${data.organizationName}</b></li>
      <li>Organization Type: <b>${typesInEnglish[data.type]}</b></li>
      <li>Organization Domain: <b>${domainsInEnglish[data.domain]}</b></li>
      <li>Organization Country: <b>${countriesInEnglish[data.country]}</b></li>
      <li>Organization Size: <b>${companySizesInEnglish[data.size]}</b></li>
      <li>Factory URL: <a href="https://${data.factoryPrefix}.pistis-market.eu">https://${
        data.factoryPrefix
    }.pistis-market.eu</a></li>
      <li>IP Address: <b>${data.ip ? data.ip : 'Unavailable'}</b></li>
      <li>The factory <b>is ${data.isAccepted ? '' : 'not '}accepted</b></li>
    </ul>
    <br/>
    <p>Please contact us for any questions you may have.</p>
    <br/>
    <p>Best regards,</p>
    <p>PISTIS Admin Console</p> 
    `;
};
