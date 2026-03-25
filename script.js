document.addEventListener('DOMContentLoaded', ()=>{
  const send = document.getElementById('send-invite');
  if(send){
    send.addEventListener('click', ()=>{
      alert('Message Sent to Jarvis');
      send.classList.add('sent');
      setTimeout(()=>send.classList.remove('sent'),900);
    });
  }
  const emergency = document.getElementById('emergency');
  if(emergency){
    emergency.addEventListener('click', ()=>{
      alert('Emergency Alert Activated');
      emergency.classList.add('activated');
      setTimeout(()=>emergency.classList.remove('activated'),1200);
    });
  }
  const memberCards = document.querySelectorAll('.member-card');
  memberCards.forEach(card=>{
    card.addEventListener('click', ()=>{
      card.classList.toggle('confirmed');
      const status = card.classList.contains('confirmed') ? 'Confirmed' : 'Unconfirmed';
      console.log(card.getAttribute('data-name') + ' is ' + status);
    });
  });
});
