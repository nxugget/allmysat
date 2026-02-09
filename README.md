# AllMySat

Synchronisez automatiquement les données de satellites depuis CelesTrak et SatNOGS vers Supabase, avec déploiement sur Vercel et synchronisation cron toutes les 2 heures.

## 🚀 Fonctionnalités

- **Synchronisation TLE** : Récupération automatique des éléments orbitaux (TLE) depuis CelesTrak
- **Transmetteurs SatNOGS** : Obtention des données de transmetteurs et modes de communication
- **Déploiement Vercel** : Prêt pour un déploiement serverless avec Vercel Functions
- **Cron Automatique** : Synchronisation toutes les 2 heures via les crons Vercel
- **Gestion d'Erreurs** : Rapports détaillés avec logs complètes
- **Supabase** : Stockage centralisé dans une base de données PostgreSQL

## 📋 Configuration Requise

### Supabase
Créez les tables suivantes dans votre base Supabase :

#### Table `satellites`
```sql
CREATE TABLE satellites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  norad_id INTEGER UNIQUE NOT NULL,
  tle_line1 TEXT,
  tle_line2 TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Table `tle`
```sql
CREATE TABLE tle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
  tle_line1 TEXT NOT NULL,
  tle_line2 TEXT NOT NULL,
  epoch VARCHAR(20),
  source VARCHAR(50) DEFAULT 'celestrak',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(satellite_id)
);
```

#### Table `transmitters`
```sql
CREATE TABLE transmitters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
  description TEXT,
  mode VARCHAR(100),
  alive BOOLEAN DEFAULT true,
  uplink_low BIGINT,
  uplink_high BIGINT,
  downlink_low BIGINT,
  downlink_high BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transmitters_satellite_id ON transmitters(satellite_id);
```

## 🔧 Installation

1. **Clonez le repo**
```bash
git clone <votre-repo>
cd allmysat
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Configurez les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Sécurité Cron
CRON_SECRET=your_secret_key_here
```

**Pour obtenir vos clés Supabase :**
1. Allez dans votre projet Supabase
2. Settings → API
3. Copiez `URL` et `Service Role Key`

## 🚀 Déploiement sur Vercel

### Déploiement Initial

1. **Connectez votre repo à Vercel**
```bash
vercel link
```

2. **Configurez les variables d'environnement**
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET
```

3. **Déployez**
```bash
vercel deploy --prod
```

### Configuration des Crons

Les crons Vercel sont configurées dans [vercel.json](vercel.json) :
- **Schedule** : `0 */2 * * *` (toutes les 2 heures)
- **Endpoint** : `/api/cron/sync`

**Note** : Les crons Vercel nécessitent un plan **Vercel Pro** ou supérieur.

## 🔐 Authentification Cron

Le endpoint cron vérifie l'en-tête `Authorization` :

```bash
curl -X POST https://your-deployment.vercel.app/api/cron/sync \
  -H "Authorization: Bearer your_cron_secret"
```

## 📊 Structure du Projet

```
allmysat/
├── api/
│   └── cron/
│       └── sync.js          # Logique de synchronisation
├── package.json              # Dépendances
├── vercel.json              # Configuration Vercel & Crons
├── .gitignore               # Fichiers ignorés
└── README.md                # Cette documentation
```

## 🔄 Flux de Synchronisation

1. **Démarrage** : Vercel déclenche le cron à l'horaire défini
2. **Authentification** : Vérification du token `CRON_SECRET`
3. **Récupération des Satellites** : Requête à Supabase pour la liste
4. **Pour chaque Satellite** :
   - Fetch TLE depuis CelesTrak (`https://celestrak.com/NORAD/elements/gp.php`)
   - Parse l'epoch et insère dans la table `tle`
   - Fetch transmetteurs depuis SatNOGS (`https://db.satnogs.org/api/transmitters/`)
   - Supprime les anciens transmetteurs
   - Insère les nouveaux transmetteurs
5. **Rapportage** : Retour JSON avec statistiques et erreurs

## 📋 Exemple de Réponse

```json
{
  "success": true,
  "timestamp": "2026-02-09T14:32:05.123Z",
  "duration": "5234ms",
  "stats": {
    "tleCount": 42,
    "transmitterCount": 156,
    "errorCount": 2
  },
  "errors": [
    "TLE sync error for SATELLITE-NAME: ...",
    "Transmitter sync error for ANOTHER-SAT: ..."
  ]
}
```

## 🛠️ Développement Local

Lancez le serveur de développement Vercel :

```bash
npm run dev
```

Testez manuellement le endpoint :

```bash
curl -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your_cron_secret"
```

## 📝 Logs et Monitoring

Tous les logs sont affichés dans la console Vercel :
- [Dashboard Vercel](https://vercel.com/dashboard) → Sélectionnez votre projet → Logs

Chaque exécution affiche :
- Heure de début/fin
- Nombre de satellites traités
- Nombre de TLE et transmetteurs synchronisés
- Erreurs rencontrées

## 🐛 Dépannage

### "Unauthorized" Error
- Vérifiez que `CRON_SECRET` dans `.env` correspond à celui de Vercel
- Vérifiez l'en-tête `Authorization` : `Bearer <secret>`

### "Missing Supabase environment variables"
- Vérifiez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
- Assurez-vous qu'elles sont configurées dans Vercel

### Aucun satellite à traiter
- Insérez des satellites dans la table `satellites` avec `norad_id`
- Vérifiez que la colonne `norad_id` n'est pas NULL

### Erreur SatNOGS/CelesTrak
- Les APIs externes peuvent être temporairement indisponibles
- Le script continue avec les erreurs et les rapporte
- Réessayez lors de la prochaine exécution programmée

## 📚 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Crons](https://vercel.com/docs/cron-jobs)
- [CelesTrak](https://celestrak.com/)
- [SatNOGS API](https://db.satnogs.org/api/)

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont bienvenues ! N'hésitez pas à ouvrir des issues ou des pull requests.
