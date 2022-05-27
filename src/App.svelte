<script>
    import  pnum from 'norwegian-national-id-validator';

    let pnr = "";

    $: validPnr = pnum.NorwegianId(pnr).isValid()

</script>
<main>
<h1 style:margin-top=0>Innmelding i trossamfunnet Gaia</h1>

<div class="frame">
    <label class="split-input first-input tl"><span>Fornavn:</span><input type="text"/></label>
    <label class="split-input tr"><span>Etternavn: </span><input type="text"/></label>
    <label class="full"><span>Adresse: </span><input type="text"/></label>
    <label class="split-input nr"><span>Postnummer</span><input type="text"/></label>
    <label class="split-input"><span>Poststed:</span><input type="text"/></label>
    <label class="full" class:invalid={!validPnr && (`$pnr`.length === 11)} >
        <span>PersonNr (11siffer):</span>
        <input class="fnr" type="text" bind:value={pnr}
               on:input={ () => pnr = pnr.replaceAll(/[^0-9]/g, "") }/>
    </label>
    <label class="full"><span>Bostedskommune i følge folkeregesteret:</span><input type="text"/></label>
    <label class="full"><span>Telefon:</span><input type="text"/></label>
    <label class="full"><span>E-post:</span><input type="text"/></label>
</div>

<div>
    <span><input type="checkbox"></span>Jeg er ikke medlem i et annet tros- eller livssynssamfunn (gjelder også Den
    norske kirke).
</div>
<div>
    <span><input type="checkbox"></span>Jeg er medlem i et annet tros- eller livssynssamfunn, men ønsker å stå
    som organisasjonsmedlem i trossamfunnet
</div>
<h3>Viktig informasjon:</h3>
<p>
    Når trossamfunnet har mottatt innmeldingsblankett ferdig utfylt, vil du motta en innmeldingsattest.
    Dette er bevis på at du er medlem hos oss.
</p>
<p>
    Etter lov om trudomssamfunn og ymist anna kreves det liste over medlemmenes fødselsnumre ved ut-
    betaling av tilskudd til trossamfunn. Våre medlemmers fødselsnummer oppgis derfor i forbindelse med
    innsending om krav om tilskudd til fylkesmannen. Når kontroll av fødselsnumre er gjennomført slettes
    disse av fylkesmannen og Brønnøysundregistrene som foretar kontrollen.
</p>

<p>
    Det er frivillig om du vil oppgi fødselsnummer. Dersom du ikke gjør det, kan ikke trossamfunnet kreve tilskudd for deg.
</p>

<p>
    Underskrift (Merk: Barn under 15 år må ha foreldrenes underskrift):
</p>

<div class="sted">Sted:</div>
<br>
<div style="display:flex;"><div class="sted">Dato:</div> <div>(dd/mm/åå)</div></div>
<br>
<div class="signatur">Signatur:</div>
<p>
    Skjemaet sendes som brevpost (merket innmelding) eller som elektronisk dokument: <a href="mailto:gaialivssynssamfunn@gmail.com">gaialivssynssamfunn@gmail.com</a>
</p>
    <p>
        <b>post adresse:</b>
        <br>Trossamfunnet Gaia
        <br>c/o Knut Olav Bøhmer
        <br>Kyrre Grepps Vei 8
        <br>1462 Fjellhamar
    </p>
<div class="no-print margin-top">
    <button on:click={() => window.print()}>
        Print
    </button>
</div>
</main>

<style>

 .sted {
     display: bock;
     width: 200px;
     border-bottom: 2px solid black;
 }

 .signatur {
     display: bock;
     width: 600px;
     border-bottom: 2px solid black;
 }

 main {
     width: 210mm;
     min-height: 297mm;
     margin: 10mm auto;
 }
 .invalid {
     border: 1px solid red;
 }


 .first-input {
     border-right: none;
     align-items: center;
 }

 .split-input {
     display: flex;
     flex: 1 45%;
     align-items: center;
 }

 .full {
     display: flex;
     flex-flow: row nowrap;
     flex: 1 200%;
     align-items: center;
 }

 span {
     min-height: 1px;
     display: inline-flex;
     align-items: center;
 }

 .tl {
     border-top-left-radius: 10px;
 }

 .tr {
     border-top-right-radius: 10px;
 }

 .nr {
     border-right: none;
 }
 input.fnr {
     flex: 1 10px;
     margin-right: 1rem;
 }

 label {
     border: 1px solid black;
     border-bottom: 0;
     padding-left: 1rem;
     display: flex;
     padding-right: 5px;
 }

 label:last-child {
     border: 1px solid black;
     border-bottom: 1px solid black;
     padding-left: 1rem;
     border-bottom-right-radius: 10px;
     border-bottom-left-radius: 10px;
 }

 input {
     border: none;
     width: 100%;
     margin-top: 8px;
 }
 input[type='checkbox'] {
     margin-right: 8px;
 }

 .frame {
     border: 0;
     padding-left: 0;
     padding-top: 0;
     padding-bottom: 0;
     display: flex;
     flex-flow: row wrap;
 }
 @media print {
     .no-print {
         display: none !important;
     }
 }
</style>
